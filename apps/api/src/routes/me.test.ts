import { ApiError, defaultNotificationPrefs, Me } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type BuildAppOptions } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { users } from '../db/schema';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique Firebase uids, only those users are deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const email = 'camille.me@example.com';

function signIn() {
  const issued = verifier.issue({ email, emailVerified: true, name: 'Camille Exemple' });
  createdUids.push(issued.uid);
  return { ...issued, headers: { authorization: `Bearer ${issued.token}` } };
}

const build = (env: Record<string, string> = {}, options: BuildAppOptions = {}) =>
  buildApp(testConfig(env), { tokenVerifier: verifier, ...options });

let app: Awaited<ReturnType<typeof build>>;
beforeAll(async () => {
  app = await build();
});
afterAll(async () => {
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

const userOf = async (uid: string) =>
  (await app.db.select().from(users).where(eq(users.firebaseUid, uid)))[0];
const patchMe = (headers: Record<string, string>, payload: object) =>
  app.inject({ method: 'PATCH', url: '/v1/me', headers, payload });

describe('GET /v1/me', () => {
  it('answers 401 without a token', async () => {
    const response = await app.inject({ url: '/v1/me' });
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
  });

  it('returns the account created from the token, never cached', async () => {
    const { uid, headers } = signIn();
    const response = await app.inject({ url: '/v1/me', headers });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const me = Me.parse(response.json());
    expect(me).toMatchObject({ email, firstName: 'Camille', role: 'user', plan: 'free' });
    expect(me.notificationPrefs).toEqual(defaultNotificationPrefs);
    expect(me.id).toBe((await userOf(uid))?.id);
    expect(response.body).not.toContain(uid);
  });
});

describe('PATCH /v1/me', () => {
  it('updates the first name, visibility and avatar, and merges preferences', async () => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/me', headers });
    await app.db
      .update(users)
      .set({ avatarUrl: 'https://example.com/avatar.jpg' })
      .where(eq(users.firebaseUid, uid));

    await patchMe(headers, { notificationPrefs: { creatorEmail: false } });
    const response = await patchMe(headers, {
      firstName: ' Alex ',
      isPublic: false,
      avatarUrl: null,
      notificationPrefs: { plannedRouteReminders: false },
    });

    expect(response.statusCode).toBe(200);
    expect(Me.parse(response.json())).toMatchObject({
      firstName: 'Alex',
      isPublic: false,
      avatarUrl: null,
      notificationPrefs: { plannedRouteReminders: false, creatorPush: true, creatorEmail: false },
    });
  });

  it.each([
    ['an empty update', {}],
    ['a role', { role: 'admin' }],
    ['a plan', { plan: 'premium' }],
    ['an e-mail', { email: 'other.me@example.com' }],
    ['a first name with markup', { firstName: '<script>x</script>' }],
    ['an avatar URL', { avatarUrl: 'https://example.com/avatar.jpg' }],
  ])('refuses %s with 400 and changes nothing', async (_, payload) => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/me', headers });
    const before = await userOf(uid);

    const response = await patchMe(headers, payload);
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
    expect(await userOf(uid)).toEqual(before);
  });

  it('answers 401 before validating the body', async () => {
    const response = await patchMe({}, { role: 'admin' });
    expect(response.statusCode).toBe(401);
  });
});

describe('DELETE /v1/me', () => {
  it('marks deleted_at and anonymizes the account, then refuses its token', async () => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/me', headers });

    const response = await app.inject({ method: 'DELETE', url: '/v1/me', headers });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(await userOf(uid)).toMatchObject({
      firebaseUid: uid,
      deletedAt: expect.any(Date),
      email: null,
      firstName: null,
      avatarUrl: null,
      isPublic: false,
      notificationPrefs: {},
    });

    for (const method of ['GET', 'DELETE'] as const) {
      const again = await app.inject({ method, url: '/v1/me', headers });
      expect(again.statusCode).toBe(401);
      expect(again.json()).toEqual({ code: 'unauthorized', message: 'Account deleted' });
    }
  });
});

describe('logs of the account routes', () => {
  it('contain no token and no e-mail', async () => {
    const lines: string[] = [];
    const logged = await build(
      { LOG_LEVEL: 'trace' },
      { logStream: { write: (line) => lines.push(line) } },
    );
    const { token, headers } = signIn();
    await logged.inject({ url: '/v1/me', headers });
    await logged.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers,
      payload: { email: 'other.me@example.com' },
    });
    await logged.inject({ url: '/v1/me', headers: { authorization: 'Bearer refused-token' } });
    await logged.inject({ method: 'DELETE', url: '/v1/me', headers });
    await logged.close();

    const logs = lines.join('');
    expect(logs).toContain('"reason":"auth/argument-error"');
    for (const leak of [token, 'refused-token', email, 'other.me@example.com', 'Camille']) {
      expect(logs).not.toContain(leak);
    }
  });
});

describe('OpenAPI document', () => {
  it('describes /v1/me behind the Firebase ID token', async () => {
    const document = (await app.inject({ url: '/docs/json' })).json();
    expect(document.paths['/v1/me'].get.security).toEqual([{ firebaseIdToken: [] }]);
    expect(document.components.securitySchemes.firebaseIdToken.scheme).toBe('bearer');
  });
});
