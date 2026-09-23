import { ApiError, type UserRole } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { users } from '../db/schema';
import { testConfig } from '../test-config';
import { TestTokenVerifier } from './test-verifier';
import type { TokenVerifier, VerifiedIdentity } from './verifier';

// Test files share one database and run in parallel: each test signs in with its own Firebase
// uid and only deletes the users it created.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];

function signIn(identity: Partial<VerifiedIdentity> = {}) {
  const issued = verifier.issue(identity);
  createdUids.push(issued.uid);
  return { ...issued, headers: { authorization: `Bearer ${issued.token}` } };
}

/** The API with one route per guard: the guards are global, routes come with their tickets. */
async function buildTestApp(tokenVerifier: TokenVerifier = verifier) {
  const app = await buildApp(testConfig(), { tokenVerifier });
  app.get('/v1/test/private', { onRequest: app.requireAuth }, async (request) => ({
    userId: request.user?.id,
  }));
  app.get('/v1/test/moderation', { onRequest: app.requireRole('moderator') }, async () => ({}));
  // Both guards, as when a plugin requires authentication and one of its routes a role.
  app.get(
    '/v1/test/editorial',
    { onRequest: [app.requireAuth, app.requireRole('editor')] },
    async () => ({}),
  );
  await app.ready();
  return app;
}

let app: Awaited<ReturnType<typeof buildTestApp>>;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

const userOf = async (uid: string) =>
  (await app.db.select().from(users).where(eq(users.firebaseUid, uid)))[0];
const setRole = (uid: string, role: UserRole) =>
  app.db.update(users).set({ role }).where(eq(users.firebaseUid, uid));

describe('requireAuth', () => {
  it.each([
    ['no Authorization header', {}],
    ['another scheme', { authorization: 'Basic ZmljdGl0aW91cw==' }],
    ['an empty bearer', { authorization: 'Bearer ' }],
    ['a token the verifier refuses', { authorization: 'Bearer fictitious-token' }],
    ['an oversized token', { authorization: `Bearer ${'x'.repeat(4097)}` }],
  ])('answers 401 unauthorized with %s', async (_, headers) => {
    const response = await app.inject({ url: '/v1/test/private', headers });
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
  });

  it('creates the account on the first valid token, then finds the same one', async () => {
    const { uid, headers } = signIn({
      email: 'camille.test@example.com',
      emailVerified: true,
      name: 'Camille Exemple',
    });
    const first = await app.inject({ url: '/v1/test/private', headers });
    const second = await app.inject({ url: '/v1/test/private', headers });

    expect(first.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(await userOf(uid)).toMatchObject({
      id: first.json().userId,
      email: 'camille.test@example.com',
      firstName: 'Camille',
      role: 'user',
      plan: 'free',
      deletedAt: null,
    });
  });

  it('keeps no unverified e-mail and no invalid first name', async () => {
    const { uid, headers } = signIn({
      email: 'unverified.test@example.com',
      emailVerified: false,
      name: '<b>Bold</b>',
    });
    await app.inject({ url: '/v1/test/private', headers });
    expect(await userOf(uid)).toMatchObject({ email: null, firstName: null });
  });

  it('creates one account for concurrent first requests', async () => {
    const { uid, headers } = signIn();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => app.inject({ url: '/v1/test/private', headers })),
    );
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200, 200, 200, 200]);
    const rows = await app.db.select().from(users).where(eq(users.firebaseUid, uid));
    expect(rows).toHaveLength(1);
  });

  it('refuses an anonymous Firebase session without creating an account', async () => {
    const { uid, headers } = signIn({ signInProvider: 'anonymous' });
    const response = await app.inject({ url: '/v1/test/private', headers });
    expect(response.statusCode).toBe(401);
    expect(await userOf(uid)).toBeUndefined();
  });

  it('refuses a deleted account, even with a valid token', async () => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/test/private', headers });
    await app.db.update(users).set({ deletedAt: new Date() }).where(eq(users.firebaseUid, uid));

    const response = await app.inject({ url: '/v1/test/private', headers });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'unauthorized', message: 'Account deleted' });
  });

  it('answers 500 without detail when the verifier fails for another reason', async () => {
    const failing = await buildTestApp({
      verify: () => Promise.reject(new Error('fictitious outage')),
    });
    const response = await failing.inject({
      url: '/v1/test/private',
      headers: { authorization: 'Bearer fictitious-token' },
    });
    await failing.close();
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('fictitious outage');
  });
});

describe('requireRole', () => {
  it('answers 401 before checking a role', async () => {
    const response = await app.inject({ url: '/v1/test/moderation' });
    expect(response.statusCode).toBe(401);
  });

  it('answers 403 forbidden to a role that does not hold the required one', async () => {
    const { uid, headers } = signIn();
    const asUser = await app.inject({ url: '/v1/test/moderation', headers });
    expect(asUser.statusCode).toBe(403);
    expect(asUser.json()).toEqual({ code: 'forbidden', message: 'Insufficient role' });

    await setRole(uid, 'editor');
    expect((await app.inject({ url: '/v1/test/moderation', headers })).statusCode).toBe(403);
    expect((await app.inject({ url: '/v1/test/editorial', headers })).statusCode).toBe(200);
  });

  it('reads the role from the database on every request', async () => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/test/private', headers });

    await setRole(uid, 'moderator');
    expect((await app.inject({ url: '/v1/test/moderation', headers })).statusCode).toBe(200);
    await setRole(uid, 'user');
    expect((await app.inject({ url: '/v1/test/moderation', headers })).statusCode).toBe(403);
    await setRole(uid, 'admin');
    expect((await app.inject({ url: '/v1/test/moderation', headers })).statusCode).toBe(200);
    expect((await app.inject({ url: '/v1/test/editorial', headers })).statusCode).toBe(200);
  });
});

describe('token verifier', () => {
  it('cannot be injected in production', async () => {
    const config = testConfig({ NODE_ENV: 'production', FIREBASE_PROJECT_ID: 'widoo-prod-check' });
    await expect(buildApp(config, { tokenVerifier: verifier })).rejects.toThrow(/production/);
  });

  it('is Firebase by default, which requires a project ID', async () => {
    const config = { ...testConfig(), firebaseProjectId: undefined };
    await expect(buildApp(config)).rejects.toThrow(/FIREBASE_PROJECT_ID/);
  });
});
