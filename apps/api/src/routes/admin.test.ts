import { AdminCounters, AdminStats, ApiError, type UserRole } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import type { VerifiedIdentity } from '../auth/verifier';
import { routes, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique Firebase uids and routes, only those are deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const hour = 60 * 60 * 1000;
const templateId = seedId('route:marais-gourmand');
const farAway = { lat: 31, lng: 31 };
const farAwayBounds = { west: 31, south: 31, east: 31.001, north: 31.001 };

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
});
afterAll(async () => {
  await app.db.delete(routes).where(inArray(routes.id, createdRouteIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

/** A member of `role`, signed in with a second factor unless the identity says otherwise. */
async function signIn(role: UserRole, identity: Partial<VerifiedIdentity> = {}) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp', ...identity });
  createdUids.push(uid);
  await app.db.insert(users).values({ firebaseUid: uid, role });
  return { authorization: `Bearer ${token}` };
}

const getCounters = (headers: Record<string, string> = {}) =>
  app.inject({ url: '/v1/admin/counters', headers });

/** A pending route copied from the seed, last changed `hoursAgo` hours ago. */
async function addPendingRoute(hoursAgo: number) {
  // Always the same demo route of the seed, never a row another test file is using, and far
  // from every zone the search tests look at.
  const [template] = await app.db.select().from(routes).where(eq(routes.id, templateId));
  if (!template) throw new Error('Demo route missing from the seed');
  const id = uuidv7();
  createdRouteIds.push(id);
  await app.db.insert(routes).values({
    ...template,
    id,
    shareToken: null,
    startLocation: farAway,
    bounds: farAwayBounds,
    status: 'pending',
    updatedAt: new Date(Date.now() - hoursAgo * hour),
  });
}

describe('guard of /admin', () => {
  it('answers 401 without a token', async () => {
    const response = await getCounters();
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
  });

  it('answers 403 forbidden to an account outside the team', async () => {
    const response = await getCounters(await signIn('user'));
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('answers 403 mfa_required to a session without a second factor', async () => {
    const response = await getCounters(await signIn('admin', { secondFactor: null }));
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('mfa_required');
  });

  it('asks for no second factor with the local Auth emulator, which has none', async () => {
    const local = await buildApp(testConfig({ FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }), {
      tokenVerifier: verifier,
    });
    try {
      const headers = await signIn('admin', { secondFactor: null });
      const response = await local.inject({ url: '/v1/admin/counters', headers });
      expect(response.statusCode).toBe(200);
    } finally {
      await local.close();
    }
  });

  it('tells an account outside the team nothing about the second factor', async () => {
    const response = await getCounters(await signIn('user', { secondFactor: null }));
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('answers 401 to a session older than 12 hours', async () => {
    const headers = await signIn('admin', { authTime: new Date(Date.now() - 13 * hour) });
    const response = await getCounters(headers);
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
  });

  it('lets in a member of the team with a second factor, never cached', async () => {
    const response = await getCounters(await signIn('editor'));
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /v1/admin/counters', () => {
  it('counts the pending routes, and those waiting for more than 72 hours', async () => {
    const headers = await signIn('moderator');
    const before = AdminCounters.parse((await getCounters(headers)).json()).moderation;
    await addPendingRoute(1);
    await addPendingRoute(80);

    const after = AdminCounters.parse((await getCounters(headers)).json()).moderation;
    expect(after).toEqual({
      count: (before?.count ?? 0) + 2,
      lateCount: (before?.lateCount ?? 0) + 1,
    });
  });

  it('gives an editor no counter of the moderation', async () => {
    const response = await getCounters(await signIn('editor'));
    expect(AdminCounters.parse(response.json())).toEqual({});
  });
});

describe('GET /v1/admin/stats', () => {
  const getStats = (headers: Record<string, string>) =>
    app.inject({ url: '/v1/admin/stats', headers });

  it('refuses an account outside the team', async () => {
    expect((await getStats(await signIn('user'))).statusCode).toBe(403);
  });

  it('gives a moderator what waits, with the oldest route of the queue', async () => {
    const headers = await signIn('moderator');
    await addPendingRoute(90);

    const stats = AdminStats.parse((await getStats(headers)).json());
    expect(Object.keys(stats.toHandle).sort()).toEqual([
      'moderation',
      'reports',
      'support',
      'translations',
    ]);
    const moderation = stats.toHandle.moderation;
    expect(moderation?.count).toBeGreaterThanOrEqual(1);
    expect(moderation?.lateCount).toBeGreaterThanOrEqual(1);
    const oldest = new Date(moderation?.oldestSince ?? '').getTime();
    expect(Date.now() - oldest).toBeGreaterThanOrEqual(90 * hour - 60_000);
  });

  it('gives an editor the catalog, the users and the tiles of its sections only', async () => {
    const response = await getStats(await signIn('editor'));
    expect(response.headers['cache-control']).toBe('no-store');
    const stats = AdminStats.parse(response.json());
    const nothing = { count: 0, lateCount: 0, oldestSince: null };
    expect(stats.toHandle).toEqual({ aiDrafts: nothing, translations: nothing });
    expect(stats.catalog.publishedRoutes).toBeGreaterThanOrEqual(1);
    expect(stats.catalog.premiumRoutes).toBeLessThanOrEqual(stats.catalog.publishedRoutes);
    expect(stats.catalog.placesInRoutes).toBeGreaterThanOrEqual(1);
    expect(stats.catalog.cities).toBeGreaterThanOrEqual(1);
    expect(stats.users.registered).toBeGreaterThanOrEqual(1);
    expect(stats.users.newLast7Days).toBeGreaterThanOrEqual(1);
    expect(stats.users.unlocksLast30Days).toBe(0);
  });

  it('counts a new account once, and a Premium plan only while it runs', async () => {
    const headers = await signIn('admin');
    const before = AdminStats.parse((await getStats(headers)).json()).users;
    const day = 24 * hour;
    for (const planExpiresAt of [new Date(Date.now() + day), new Date(Date.now() - day)]) {
      const { uid } = verifier.issue();
      createdUids.push(uid);
      await app.db.insert(users).values({ firebaseUid: uid, plan: 'premium', planExpiresAt });
    }

    const after = AdminStats.parse((await getStats(headers)).json()).users;
    expect(after.registered - before.registered).toBeGreaterThanOrEqual(2);
    expect(after.premiumActive - before.premiumActive).toBeGreaterThanOrEqual(1);
  });
});
