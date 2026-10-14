import { randomUUID } from 'node:crypto';
import { ApiError } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { devices, users } from '../db/schema';
import { testConfig } from '../test-config';
import { devicesPerUserMax, localeOfUser } from '../users/devices';

// Shared database, parallel files: unique Firebase uids and push tokens, only those are deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];

function signIn() {
  const issued = verifier.issue();
  createdUids.push(issued.uid);
  return { ...issued, headers: { authorization: `Bearer ${issued.token}` } };
}

const fictitiousToken = () => `ExponentPushToken[fictitious-${randomUUID()}]`;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

const register = (headers: Record<string, string>, payload: object) =>
  app.inject({ method: 'POST', url: '/v1/me/devices', headers, payload });

/** The account of a signed-in identity, created by its first request. */
async function accountOf(headers: Record<string, string>): Promise<string> {
  return (await app.inject({ url: '/v1/me', headers })).json().id;
}

const devicesOf = (userId: string) =>
  app.db.select().from(devices).where(eq(devices.userId, userId));

describe('POST /v1/me/devices', () => {
  it('answers 401 without a token, before validating the body', async () => {
    const response = await register({}, { pushToken: 'nope' });
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
  });

  it('registers the push token with the language of the phone, without echoing it', async () => {
    const { headers } = signIn();
    const userId = await accountOf(headers);
    const pushToken = fictitiousToken();

    const response = await register(headers, { pushToken, locale: 'en' });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(await devicesOf(userId)).toMatchObject([{ pushToken, locale: 'en' }]);
  });

  it('updates the language of a phone registered again, once', async () => {
    const { headers } = signIn();
    const userId = await accountOf(headers);
    const pushToken = fictitiousToken();

    await register(headers, { pushToken, locale: 'fr' });
    const [first] = await devicesOf(userId);
    await register(headers, { pushToken, locale: 'en' });

    const kept = await devicesOf(userId);
    expect(kept).toMatchObject([{ id: first?.id, pushToken, locale: 'en' }]);
    expect(kept[0]?.updatedAt.getTime()).toBeGreaterThanOrEqual(first?.updatedAt.getTime() ?? 0);
  });

  it('moves a phone to the account signed in on it now', async () => {
    const previous = signIn();
    const current = signIn();
    const previousId = await accountOf(previous.headers);
    const currentId = await accountOf(current.headers);
    const pushToken = fictitiousToken();

    await register(previous.headers, { pushToken, locale: 'fr' });
    expect(await register(current.headers, { pushToken, locale: 'en' })).toMatchObject({
      statusCode: 204,
    });

    expect(await devicesOf(previousId)).toEqual([]);
    expect(await devicesOf(currentId)).toMatchObject([{ pushToken, locale: 'en' }]);
  });

  it(`keeps the ${devicesPerUserMax} phones registered last`, async () => {
    const { headers } = signIn();
    const userId = await accountOf(headers);
    const pushTokens = Array.from({ length: devicesPerUserMax + 2 }, fictitiousToken);
    for (const pushToken of pushTokens) {
      await register(headers, { pushToken, locale: 'fr' });
    }

    const kept = (await devicesOf(userId)).map((device) => device.pushToken);
    expect(kept.sort()).toEqual(pushTokens.slice(2).sort());
  });

  it.each([
    ['no language', { pushToken: 'ExponentPushToken[abc]' }],
    ['a language the app does not ship', { pushToken: 'ExponentPushToken[abc]', locale: 'it' }],
    ['a token that is not an Expo token', { pushToken: 'abc123', locale: 'fr' }],
    ['another account', { pushToken: 'ExponentPushToken[abc]', locale: 'fr', userId: 'x' }],
  ])('refuses %s with 422 and stores nothing', async (_, payload) => {
    const { headers } = signIn();
    const userId = await accountOf(headers);

    const response = await register(headers, payload);
    expect(response.statusCode).toBe(422);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
    expect(await devicesOf(userId)).toEqual([]);
  });

  it('refuses a deleted account', async () => {
    const { headers } = signIn();
    await accountOf(headers);
    await app.inject({ method: 'DELETE', url: '/v1/me', headers });

    const response = await register(headers, { pushToken: fictitiousToken(), locale: 'fr' });
    expect(response.statusCode).toBe(401);
  });

  it('logs no push token', async () => {
    const lines: string[] = [];
    const logged = await buildApp(testConfig({ LOG_LEVEL: 'trace' }), {
      tokenVerifier: verifier,
      logStream: { write: (line) => lines.push(line) },
    });
    const { headers } = signIn();
    const pushToken = fictitiousToken();
    await logged.inject({
      method: 'POST',
      url: '/v1/me/devices',
      headers,
      payload: {
        pushToken,
        locale: 'fr',
      },
    });
    await logged.inject({
      method: 'POST',
      url: '/v1/me/devices',
      headers,
      payload: { pushToken: `${pushToken}-malformed`, locale: 'fr' },
    });
    await logged.close();

    expect(lines.join('')).toContain('/v1/me/devices');
    expect(lines.join('')).not.toContain(pushToken.slice('ExponentPushToken['.length, -1));
  });
});

describe('localeOfUser', () => {
  it('is the language of the account, else of its last phone, else French', async () => {
    const { headers } = signIn();
    const userId = await accountOf(headers);
    expect(await localeOfUser(app.db, userId)).toBe('fr');

    await register(headers, { pushToken: fictitiousToken(), locale: 'en' });
    expect(await localeOfUser(app.db, userId)).toBe('en');

    await register(headers, { pushToken: fictitiousToken(), locale: 'fr' });
    expect(await localeOfUser(app.db, userId)).toBe('fr');

    await app.inject({ method: 'PATCH', url: '/v1/me', headers, payload: { locale: 'en' } });
    expect(await localeOfUser(app.db, userId)).toBe('en');
  });

  it('is null for a deleted account', async () => {
    const { headers } = signIn();
    const userId = await accountOf(headers);
    await app.inject({ method: 'DELETE', url: '/v1/me', headers });
    expect(await localeOfUser(app.db, userId)).toBeNull();
  });
});
