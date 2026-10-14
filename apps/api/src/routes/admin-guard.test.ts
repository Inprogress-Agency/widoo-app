import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Every route of the admin, read from the OpenAPI document the API serves: a route added later
// is checked without being listed here.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;
let adminRoutes: { method: string; url: string }[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  const document = (await app.inject({ url: '/docs/json' })).json<{
    paths: Record<string, Record<string, unknown>>;
  }>();
  adminRoutes = Object.entries(document.paths)
    .filter(([path]) => path.startsWith('/v1/admin/'))
    .flatMap(([path, operations]) =>
      Object.keys(operations).map((method) => ({
        method: method.toUpperCase(),
        // Any identifier: the guard answers before the route reads it.
        url: path.replaceAll(/\{[^}]+\}/g, uuidv7()),
      })),
    );
});
afterAll(async () => {
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

describe('routes of the admin', () => {
  it('exist', () => {
    expect(adminRoutes.length).toBeGreaterThan(0);
  });

  it('all refuse a request without token', async () => {
    for (const { method, url } of adminRoutes) {
      const response = await app.inject({ method: method as 'GET', url, payload: {} });
      expect({ method, url, status: response.statusCode }).toEqual({ method, url, status: 401 });
    }
  });

  it('all refuse an account outside the team, even with a second factor', async () => {
    const { token, uid } = verifier.issue({ secondFactor: 'totp' });
    createdUids.push(uid);
    await app.db.insert(users).values({ firebaseUid: uid, role: 'user' });
    const headers = { authorization: `Bearer ${token}` };
    for (const { method, url } of adminRoutes) {
      const response = await app.inject({ method: method as 'GET', url, headers, payload: {} });
      expect({ method, url, status: response.statusCode }).toEqual({ method, url, status: 403 });
    }
  });
});
