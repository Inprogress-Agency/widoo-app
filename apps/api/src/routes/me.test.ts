import { ApiError, defaultNotificationPrefs, Me } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type BuildAppOptions } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { devices, routeUnlocks, userAnecdotes, userFeaturedRoutes, users } from '../db/schema';
import { seed } from '../db/seed';
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
    expect(me.locale).toBeNull();
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

    await patchMe(headers, { notificationPrefs: { myRoutes: false } });
    const response = await patchMe(headers, {
      firstName: ' Alex ',
      isPublic: false,
      avatarUrl: null,
      notificationPrefs: { nextDay: false },
    });

    expect(response.statusCode).toBe(200);
    const me = response.json();
    expect(Me.parse(me)).toMatchObject({
      firstName: 'Alex',
      isPublic: false,
      avatarUrl: null,
      notificationPrefs: { reminders: true, nextDay: false, myRoutes: false },
    });
    expect(Object.keys(me.notificationPrefs).sort()).toEqual(['myRoutes', 'nextDay', 'reminders']);
    // Stored with the keys of the wiki (Modele-de-Donnees).
    expect((await userOf(uid))?.notificationPrefs).toEqual({ next_day: false, my_routes: false });
  });

  it('keeps the chosen language, then follows the phone again with null', async () => {
    const { uid, headers } = signIn();
    const english = await patchMe(headers, { locale: 'en' });
    expect(english.statusCode).toBe(200);
    expect(Me.parse(english.json()).locale).toBe('en');
    expect((await userOf(uid))?.locale).toBe('en');
    expect(Me.parse((await app.inject({ url: '/v1/me', headers })).json()).locale).toBe('en');

    const phone = await patchMe(headers, { locale: null });
    expect(Me.parse(phone.json()).locale).toBeNull();
    expect((await userOf(uid))?.locale).toBeNull();
  });

  it('exposes the keys of the wiki only, even over provisional keys left in the column', async () => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/me', headers });
    await app.db
      .update(users)
      .set({ notificationPrefs: { plannedRouteReminders: false, creatorEmail: false } })
      .where(eq(users.firebaseUid, uid));

    const me = (await app.inject({ url: '/v1/me', headers })).json();
    expect(me.notificationPrefs).toEqual(defaultNotificationPrefs);
  });

  it.each([
    ['an empty update', {}],
    ['a role', { role: 'admin' }],
    ['a plan', { plan: 'premium' }],
    ['an e-mail', { email: 'other.me@example.com' }],
    ['a first name with markup', { firstName: '<script>x</script>' }],
    ['an avatar URL', { avatarUrl: 'https://example.com/avatar.jpg' }],
    ['a provisional key of #385', { notificationPrefs: { plannedRouteReminders: false } }],
    ['another provisional key', { notificationPrefs: { creatorPush: false } }],
    ['the stored form of a key', { notificationPrefs: { next_day: false } }],
    ['a language the app does not ship', { locale: 'de' }],
  ])('refuses %s with 422 and changes nothing', async (_, payload) => {
    const { uid, headers } = signIn();
    await app.inject({ url: '/v1/me', headers });
    const before = await userOf(uid);

    const response = await patchMe(headers, payload);
    expect(response.statusCode).toBe(422);
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
    const userId = (await userOf(uid))?.id ?? '';
    const { routeIds } = await seed(app.db);
    await app.db
      .update(users)
      .set({ bio: 'Flâneuse du dimanche.', neighborhood: 'Paris 11e', locale: 'en' })
      .where(eq(users.id, userId));
    await app.db
      .insert(userAnecdotes)
      .values({ userId, questionKey: 'hidden_gem', answer: 'Un passage couvert.', position: 1 });
    await app.db
      .insert(userFeaturedRoutes)
      .values({ userId, routeId: routeIds[0] ?? '', position: 1 });
    await app.db
      .insert(routeUnlocks)
      .values({ userId, routeId: routeIds[0] ?? '', storeTransactionId: `fictitious-${uid}` });
    await app.db
      .insert(devices)
      .values({ userId, pushToken: `ExponentPushToken[deleted-${uid}]`, locale: 'en' });

    const response = await app.inject({ method: 'DELETE', url: '/v1/me', headers });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(await userOf(uid)).toMatchObject({
      firebaseUid: uid,
      deletedAt: expect.any(Date),
      email: null,
      firstName: null,
      avatarUrl: null,
      bio: null,
      neighborhood: null,
      isPublic: false,
      notificationPrefs: {},
      locale: null,
    });
    for (const table of [userAnecdotes, userFeaturedRoutes, routeUnlocks, devices]) {
      expect(await app.db.select().from(table).where(eq(table.userId, userId))).toEqual([]);
    }

    for (const method of ['GET', 'DELETE'] as const) {
      const again = await app.inject({ method, url: '/v1/me', headers });
      expect(again.statusCode).toBe(401);
      expect(again.json()).toEqual({ code: 'unauthorized', message: 'Account deleted' });
    }
  });

  it('lets the same identity sign up again into a new account, the old one kept anonymized', async () => {
    const { uid, headers } = signIn();
    const old = Me.parse((await app.inject({ url: '/v1/me', headers })).json());
    expect((await app.inject({ method: 'DELETE', url: '/v1/me', headers })).statusCode).toBe(204);
    const [deleted] = await app.db.select().from(users).where(eq(users.id, old.id));

    const again = verifier.issue({
      uid,
      email,
      emailVerified: true,
      name: 'Camille Exemple',
      authTime: new Date((deleted?.deletedAt?.getTime() ?? 0) + 1000),
    });
    const response = await app.inject({
      url: '/v1/me',
      headers: { authorization: `Bearer ${again.token}` },
    });
    expect(response.statusCode).toBe(200);
    const fresh = Me.parse(response.json());
    expect(fresh.id).not.toBe(old.id);
    expect(fresh).toMatchObject({ email, firstName: 'Camille', role: 'user', plan: 'free' });

    const [kept] = await app.db.select().from(users).where(eq(users.id, old.id));
    expect(kept).toEqual(deleted);
    expect(kept).toMatchObject({ deletedAt: expect.any(Date), email: null, firstName: null });
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
