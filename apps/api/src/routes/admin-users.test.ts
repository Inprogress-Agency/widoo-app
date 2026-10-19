import { AdminUserDetail, AdminUsers, ApiError, MyDataExport, type UserRole } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { canAccessRoute } from '../access/route-access';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, routeRatings, routeUnlocks, routes, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users and routes, and only those are listed or deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const marker = `userstest${uuidv7().slice(-12)}`;
const templateId = seedId('route:marais-gourmand');
const farAway = { lat: 33, lng: 33 };
const farAwayBounds = { west: 33, south: 33, east: 33.001, north: 33.001 };
const day = 24 * 60 * 60 * 1000;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
});
afterAll(async () => {
  const ids = await app.db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.firebaseUid, createdUids));
  await app.db.delete(adminActions).where(
    inArray(
      adminActions.targetId,
      ids.map((row) => row.id),
    ),
  );
  await app.db.delete(routes).where(inArray(routes.id, createdRouteIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

/** An account of this file, signed in with a second factor; `firstName` carries the marker. */
async function signIn(role: UserRole, name = 'Membre') {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  const [user] = await app.db
    .insert(users)
    .values({ firebaseUid: uid, role, firstName: name, email: `${name}-${uid}@${marker}.test` })
    .returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

async function addRoute(access: 'free' | 'premium', status: 'published' | 'draft' = 'published') {
  const [template] = await app.db.select().from(routes).where(eq(routes.id, templateId));
  if (!template) throw new Error('Demo route missing from the seed');
  const id = uuidv7();
  createdRouteIds.push(id);
  await app.db.insert(routes).values({
    ...template,
    id,
    authorId: null,
    shareToken: null,
    startLocation: farAway,
    bounds: farAwayBounds,
    status,
    access,
    title: `Parcours ${marker}`,
  });
  return id;
}

type Headers = Record<string, string>;
const get = (headers: Headers, url: string) => app.inject({ url: `/v1/admin${url}`, headers });
const send = (
  method: 'POST' | 'PATCH' | 'DELETE',
  headers: Headers,
  url: string,
  payload?: object,
) => app.inject({ method, url: `/v1/admin${url}`, headers, payload });
const journalOf = async (targetId: string) =>
  (await app.db.select().from(adminActions).where(eq(adminActions.targetId, targetId))).map(
    (row) => row.action,
  );

describe('GET /v1/admin/users', () => {
  it('is for moderators and admins, not for an editor', async () => {
    const editor = await signIn('editor');
    const response = await get(editor.headers, '/users');
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('finds an account by part of its e-mail or first name, and by identifier', async () => {
    const moderator = await signIn('moderator');
    const target = await signIn('user', 'Zéphyrine');
    const byMail = AdminUsers.parse((await get(moderator.headers, `/users?q=${marker}`)).json());
    expect(byMail.items.map((item) => item.id)).toContain(target.id);
    const byName = AdminUsers.parse(
      (await get(moderator.headers, `/users?q=${encodeURIComponent('zéphyr')}`)).json(),
    );
    expect(byName.items.map((item) => item.id)).toContain(target.id);
    const byId = AdminUsers.parse((await get(moderator.headers, `/users?q=${target.id}`)).json());
    expect(byId.items.map((item) => item.id)).toEqual([target.id]);
    expect(byId.items[0]).toMatchObject({ role: 'user', plan: { plan: 'free', source: 'store' } });
  });

  it('does not take % or _ as jokers', async () => {
    const moderator = await signIn('moderator');
    const response = AdminUsers.parse((await get(moderator.headers, '/users?q=%25')).json());
    expect(response.items.every((item) => `${item.email}${item.firstName}`.includes('%'))).toBe(
      true,
    );
  });

  it('reads the card of an account, and answers 404 for an unknown one', async () => {
    const moderator = await signIn('moderator');
    const target = await signIn('user');
    const card = AdminUserDetail.parse(
      (await get(moderator.headers, `/users/${target.id}`)).json(),
    );
    expect(card).toMatchObject({
      id: target.id,
      suspendedAt: null,
      certification: { isCertified: false, override: 'none' },
      ratingsGiven: [],
      ratingsReceived: [],
    });
    const missing = await get(moderator.headers, `/users/${uuidv7()}`);
    expect(missing.statusCode).toBe(404);
  });

  it('shows on the card the ratings an account gave and the ones its routes received', async () => {
    const moderator = await signIn('moderator');
    const author = await signIn('user', 'Autrice');
    const rater = await signIn('user', 'Notateur');
    const authored = await addRoute('free');
    const rated = await addRoute('free');
    await app.db.update(routes).set({ authorId: author.id }).where(eq(routes.id, authored));
    await app.db.insert(routeRatings).values([
      { routeId: authored, userId: rater.id, rating: 2, comment: 'Décevant', status: 'hidden' },
      { routeId: rated, userId: author.id, rating: 5, comment: null },
    ]);

    const received = AdminUserDetail.parse(
      (await get(moderator.headers, `/users/${author.id}`)).json(),
    );
    const given = AdminUserDetail.parse(
      (await get(moderator.headers, `/users/${rater.id}`)).json(),
    );

    expect(received.ratingsReceived).toMatchObject([
      { route: { id: authored }, score: 2, comment: 'Décevant', isHidden: true },
    ]);
    expect(received.ratingsGiven).toMatchObject([
      { route: { id: rated }, score: 5, comment: null, isHidden: false },
    ]);
    expect(given.ratingsGiven).toMatchObject([{ route: { id: authored }, score: 2 }]);
    expect(given.ratingsReceived).toEqual([]);
  });
});

describe('role, suspension and the other actions by role', () => {
  it('lets only an admin change a role, never their own', async () => {
    const admin = await signIn('admin');
    const moderator = await signIn('moderator');
    const target = await signIn('user');
    const refused = await send('PATCH', moderator.headers, `/users/${target.id}/role`, {
      role: 'editor',
    });
    expect(refused.statusCode).toBe(403);
    const own = await send('PATCH', admin.headers, `/users/${admin.id}/role`, { role: 'user' });
    expect(own.statusCode).toBe(403);
    const changed = await send('PATCH', admin.headers, `/users/${target.id}/role`, {
      role: 'editor',
    });
    expect(changed.statusCode).toBe(200);
    expect(AdminUserDetail.parse(changed.json()).role).toBe('editor');
    expect(await journalOf(target.id)).toEqual(['user.change_role']);
  });

  it('lets a moderator suspend a user, not an editor, a moderator, an admin or themselves', async () => {
    const moderator = await signIn('moderator');
    const user = await signIn('user');
    const editor = await signIn('editor');
    const otherModerator = await signIn('moderator');
    const admin = await signIn('admin');
    for (const refused of [editor, otherModerator, admin, moderator]) {
      const response = await send('POST', moderator.headers, `/users/${refused.id}/suspend`, {
        reason: 'Test',
      });
      expect(response.statusCode).toBe(403);
    }
    const response = await send('POST', moderator.headers, `/users/${user.id}/suspend`, {
      reason: 'Propos injurieux',
    });
    expect(response.statusCode).toBe(200);
  });

  it('refuses an admin to suspend themselves, and asks for a reason', async () => {
    const admin = await signIn('admin');
    const own = await send('POST', admin.headers, `/users/${admin.id}/suspend`, { reason: 'Moi' });
    expect(own.statusCode).toBe(403);
    const target = await signIn('user');
    const blank = await send('POST', admin.headers, `/users/${target.id}/suspend`, {});
    expect(blank.statusCode).toBe(422);
  });

  it('refuses a suspended account everywhere, hides its profile, and lets a reactivation undo it', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user', 'Visible');
    expect((await app.inject({ url: '/v1/me', headers: target.headers })).statusCode).toBe(200);
    expect((await app.inject({ url: `/v1/users/${target.id}/profile` })).statusCode).toBe(200);

    const suspended = await send('POST', admin.headers, `/users/${target.id}/suspend`, {
      reason: 'Spam',
    });
    expect(suspended.statusCode).toBe(200);
    expect(AdminUserDetail.parse(suspended.json())).toMatchObject({ suspensionReason: 'Spam' });
    const refused = await app.inject({ url: '/v1/me', headers: target.headers });
    expect(refused.statusCode).toBe(403);
    expect(ApiError.parse(refused.json()).code).toBe('account_suspended');
    expect((await app.inject({ url: `/v1/users/${target.id}/profile` })).statusCode).toBe(404);
    const again = await send('POST', admin.headers, `/users/${target.id}/suspend`, { reason: 'X' });
    expect(again.statusCode).toBe(409);

    const back = await send('POST', admin.headers, `/users/${target.id}/reactivate`, {
      reason: 'Erreur',
    });
    expect(AdminUserDetail.parse(back.json())).toMatchObject({
      suspendedAt: null,
      suspensionReason: null,
    });
    expect((await app.inject({ url: '/v1/me', headers: target.headers })).statusCode).toBe(200);
    expect(await journalOf(target.id)).toEqual(['user.suspend', 'user.reactivate']);
    const notSuspended = await send('POST', admin.headers, `/users/${target.id}/reactivate`, {
      reason: 'Encore',
    });
    expect(notSuspended.statusCode).toBe(409);
  });

  it('keeps the other actions for the admin', async () => {
    const moderator = await signIn('moderator');
    const target = await signIn('user');
    const route = await addRoute('premium');
    const attempts = [
      send('POST', moderator.headers, `/users/${target.id}/gift`, {
        until: new Date(Date.now() + day).toISOString(),
      }),
      send('POST', moderator.headers, `/users/${target.id}/gift`, { routeId: route }),
      send('POST', moderator.headers, `/users/${target.id}/certification`, { override: 'granted' }),
      get(moderator.headers, `/users/${target.id}/export`),
      send('DELETE', moderator.headers, `/users/${target.id}`),
    ];
    for (const response of await Promise.all(attempts)) {
      expect(response.statusCode).toBe(403);
    }
  });
});

describe('offering Premium', () => {
  it('gives Premium until a date, then stops by itself', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user');
    const until = new Date(Date.now() + 7 * day);
    const response = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      until: until.toISOString(),
    });
    expect(response.statusCode).toBe(200);
    expect(AdminUserDetail.parse(response.json()).plan).toEqual({
      plan: 'premium',
      source: 'gift',
      expiresAt: until.toISOString(),
    });
    const [row] = await app.db.select().from(users).where(eq(users.id, target.id));
    if (!row) throw new Error('User missing');
    const premiumRoute = { id: uuidv7(), access: 'premium' as const };
    const viewer = {
      plan: row.plan,
      planExpiresAt: row.planExpiresAt,
      unlockedRouteIds: new Set<string>(),
      authoredRouteIds: new Set<string>(),
    };
    expect(canAccessRoute(premiumRoute, viewer, new Date())).toBe(true);
    expect(canAccessRoute(premiumRoute, viewer, new Date(until.getTime() + 1000))).toBe(false);
    expect(await journalOf(target.id)).toEqual(['user.gift_premium']);
  });

  it('refuses a past date, both fields, neither, and a running store plan', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user');
    const route = await addRoute('premium');
    const bodies = [
      { until: new Date(Date.now() - day).toISOString() },
      { until: new Date(Date.now() + day).toISOString(), routeId: route },
      {},
    ];
    const codes = [400, 422, 422];
    for (const [index, body] of bodies.entries()) {
      const response = await send('POST', admin.headers, `/users/${target.id}/gift`, body);
      expect(response.statusCode).toBe(codes[index]);
    }
    await app.db
      .update(users)
      .set({ plan: 'premium', planExpiresAt: new Date(Date.now() + 30 * day) })
      .where(eq(users.id, target.id));
    const running = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      until: new Date(Date.now() + day).toISOString(),
    });
    expect(running.statusCode).toBe(409);
    expect(ApiError.parse(running.json()).details).toEqual({ reason: 'active_store_plan' });
  });

  it('replaces a store plan that has ended', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user');
    await app.db
      .update(users)
      .set({ plan: 'premium', planExpiresAt: new Date(Date.now() - day) })
      .where(eq(users.id, target.id));
    const response = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      until: new Date(Date.now() + day).toISOString(),
    });
    expect(response.statusCode).toBe(200);
  });

  it('offers one Premium route, once', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user');
    const route = await addRoute('premium');
    const response = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      routeId: route,
    });
    expect(response.statusCode).toBe(200);
    expect(AdminUserDetail.parse(response.json()).unlockedRoutes).toMatchObject([
      { id: route, source: 'gift' },
    ]);
    const [unlock] = await app.db
      .select()
      .from(routeUnlocks)
      .where(eq(routeUnlocks.userId, target.id));
    expect(unlock).toMatchObject({ routeId: route, source: 'gift', storeTransactionId: null });
    const twice = await send('POST', admin.headers, `/users/${target.id}/gift`, { routeId: route });
    expect(twice.statusCode).toBe(409);
    expect(ApiError.parse(twice.json()).details).toEqual({ reason: 'route_already_unlocked' });
    const free = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      routeId: await addRoute('free'),
    });
    expect(free.statusCode).toBe(409);
    const ownRoute = await addRoute('premium');
    await app.db.update(routes).set({ authorId: target.id }).where(eq(routes.id, ownRoute));
    const own = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      routeId: ownRoute,
    });
    expect(own.statusCode).toBe(409);
    expect(ApiError.parse(own.json()).details).toEqual({ reason: 'own_route' });
    const draft = await send('POST', admin.headers, `/users/${target.id}/gift`, {
      routeId: await addRoute('premium', 'draft'),
    });
    expect(draft.statusCode).toBe(404);
  });
});

describe('certification, export and deletion', () => {
  it('awards and removes the badge, which wins over the computation', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user');
    const granted = await send('POST', admin.headers, `/users/${target.id}/certification`, {
      override: 'granted',
    });
    expect(AdminUserDetail.parse(granted.json()).certification).toMatchObject({
      isCertified: true,
      computed: false,
      override: 'granted',
    });
    const revoked = await send('POST', admin.headers, `/users/${target.id}/certification`, {
      override: 'revoked',
    });
    expect(AdminUserDetail.parse(revoked.json()).certification.isCertified).toBe(false);
    expect(await journalOf(target.id)).toEqual(['user.certification', 'user.certification']);
  });

  it('exports the data of an account, and keeps a trace of it', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user', 'Exporté');
    const response = await get(admin.headers, `/users/${target.id}/export`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-disposition']).toContain('widoo-donnees-');
    expect(MyDataExport.parse(response.json()).account.id).toBe(target.id);
    expect(await journalOf(target.id)).toEqual(['user.export']);
  });

  it('deletes a user with the rule of the app, but not an account of the team nor their own', async () => {
    const admin = await signIn('admin');
    const target = await signIn('user', 'Partante');
    const editor = await signIn('editor');
    expect((await send('DELETE', admin.headers, `/users/${editor.id}`)).statusCode).toBe(403);
    expect((await send('DELETE', admin.headers, `/users/${admin.id}`)).statusCode).toBe(403);
    const response = await send('DELETE', admin.headers, `/users/${target.id}`);
    expect(response.statusCode).toBe(204);
    const [row] = await app.db.select().from(users).where(eq(users.id, target.id));
    expect(row).toMatchObject({ firstName: null, email: null, isPublic: false });
    expect(row?.deletedAt).not.toBeNull();
    expect((await get(admin.headers, `/users/${target.id}`)).statusCode).toBe(404);
    expect((await send('DELETE', admin.headers, `/users/${target.id}`)).statusCode).toBe(404);
    expect(await journalOf(target.id)).toEqual(['user.delete']);
  });
});
