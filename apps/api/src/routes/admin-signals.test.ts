import {
  AdminRatings,
  AdminSignaledPlaces,
  ApiError,
  PlaceActionResult,
  PlaceAlreadyDecidedDetails,
  type CatalogPlaceInput,
  type RouteStatus,
  type UserRole,
} from '@widoo/shared';
import { and, eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { createCatalogPlace } from '../catalog/place-writes';
import { adminActions, moderationActionsTable, places, routes, steps, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users, and places and routes found by a marker.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const marker = `signaltest-${uuidv7()}`;
const templateId = seedId('route:marais-gourmand');
const farAway = { lat: 33.5, lng: 33.5 };
const farAwayBounds = { west: 33.5, south: 33.5, east: 33.501, north: 33.501 };

let app: Awaited<ReturnType<typeof buildApp>>;
let adminId: string;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  adminId = (await signIn('admin')).id;
});
afterAll(async () => {
  const created = await app.db
    .select({ id: places.id })
    .from(places)
    .where(like(places.name, `%${marker}%`));
  const placeIds = created.map((place) => place.id);
  await app.db
    .delete(adminActions)
    .where(inArray(adminActions.targetId, [...placeIds, ...createdRouteIds]));
  await app.db.delete(routes).where(inArray(routes.id, createdRouteIds));
  if (placeIds.length > 0) {
    await app.db.delete(places).where(inArray(places.id, placeIds));
  }
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  const [user] = await app.db.insert(users).values({ firebaseUid: uid, role }).returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

// Inside the bounds of Paris of the seed.
const sheet = (name: string): CatalogPlaceInput => ({
  name: `${name} ${marker}`,
  category: 'cafe',
  address: '12 rue des Martyrs, 75009 Paris',
  location: { lat: 48.8785, lng: 2.3397 },
  isIndoor: true,
  priceRange: null,
  websiteUrl: null,
  phone: null,
  hours: [],
});

/** A place of the catalog in `status`, with a route in `routeStatus` that goes through it. */
async function addPlace(
  name: string,
  status: 'flagged' | 'verified' | 'stale',
  routeStatus: RouteStatus | null = null,
) {
  const placeId = await createCatalogPlace(app.db, sheet(name), adminId);
  await app.db
    .update(places)
    .set({ verificationStatus: status, confirmationsSinceVerified: 3.5 })
    .where(eq(places.id, placeId));
  let routeId: string | null = null;
  if (routeStatus) {
    const [template] = await app.db.select().from(routes).where(eq(routes.id, templateId));
    const [step] = await app.db.select().from(steps).where(eq(steps.routeId, templateId)).limit(1);
    if (!template || !step) throw new Error('Demo route missing from the seed');
    routeId = uuidv7();
    createdRouteIds.push(routeId);
    await app.db.insert(routes).values({
      ...template,
      id: routeId,
      shareToken: null,
      startLocation: farAway,
      bounds: farAwayBounds,
      status: routeStatus,
      title: `${name} ${marker}`,
    });
    await app.db.insert(steps).values({ ...step, id: uuidv7(), routeId, placeId });
  }
  return { placeId, routeId };
}

const list = (headers: Record<string, string>) => app.inject({ url: '/v1/admin/signals', headers });
const act = (
  headers: Record<string, string>,
  placeId: string,
  action: 'verify' | 'close',
  payload?: object,
) => app.inject({ method: 'POST', url: `/v1/admin/places/${placeId}/${action}`, headers, payload });
const routeStatusOf = async (id: string) =>
  (await app.db.select({ status: routes.status }).from(routes).where(eq(routes.id, id)))[0]?.status;

describe('GET /v1/admin/signals', () => {
  it('is for moderators and admins, not for an editor', async () => {
    const editor = await signIn('editor');
    expect((await list(editor.headers)).statusCode).toBe(403);
  });

  it('lists the flagged places with the published routes that go through them', async () => {
    const moderator = await signIn('moderator');
    const flagged = await addPlace('Signalé', 'flagged', 'published');
    await addPlace('Vérifié', 'verified');
    const unpublished = await addPlace('Hors ligne', 'flagged', 'unpublished');

    const response = await list(moderator.headers);

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = AdminSignaledPlaces.parse(response.json());
    const mine = body.items.filter((item) => item.name.includes(marker));
    expect(mine.map((item) => item.name.split(' ')[0]).sort()).toEqual(['Hors', 'Signalé']);
    const item = mine.find((place) => place.id === flagged.placeId);
    expect(item).toMatchObject({
      verificationStatus: 'flagged',
      cityName: 'Paris',
      signalCount: 0,
      confirmationCount: 3.5,
    });
    expect(item?.routes.map((route) => route.id)).toEqual([flagged.routeId]);
    const noRoute = mine.find((place) => place.id === unpublished.placeId);
    expect(noRoute?.routes).toEqual([]);
  });
});

describe('what waits in the navigation', () => {
  it('counts a flagged place with the reports, until it is verified', async () => {
    const moderator = await signIn('moderator');
    const counted = async () =>
      (
        (await app.inject({ url: '/v1/admin/counters', headers: moderator.headers })).json() as {
          reports?: { count: number };
        }
      ).reports?.count ?? 0;
    const before = await counted();
    const { placeId } = await addPlace('Compté', 'flagged');

    expect(await counted()).toBe(before + 1);

    await act(moderator.headers, placeId, 'verify');
    expect(await counted()).toBe(before);
  });
});

describe('POST /v1/admin/places/:id/verify', () => {
  it('marks the place verified, from zero, and writes it in the journal', async () => {
    const moderator = await signIn('moderator');
    const { placeId } = await addPlace('À vérifier', 'flagged');

    const response = await act(moderator.headers, placeId, 'verify');

    expect(response.statusCode).toBe(200);
    expect(PlaceActionResult.parse(response.json())).toEqual({
      placeId,
      verificationStatus: 'verified',
      routesToFix: 0,
    });
    const [row] = await app.db.select().from(places).where(eq(places.id, placeId));
    expect(row).toMatchObject({ verificationStatus: 'verified', confirmationsSinceVerified: 0 });
    expect(row?.verifiedAt).toBeInstanceOf(Date);
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(and(eq(adminActions.targetId, placeId), eq(adminActions.action, 'place.verify')));
    expect(entry).toMatchObject({ actorId: moderator.id, action: 'place.verify' });
  });

  it('answers 409 already_decided to a place that is already verified', async () => {
    const moderator = await signIn('moderator');
    const { placeId } = await addPlace('Déjà', 'verified');

    const response = await act(moderator.headers, placeId, 'verify');

    expect(response.statusCode).toBe(409);
    const error = ApiError.parse(response.json());
    expect(error.code).toBe('already_decided');
    expect(PlaceAlreadyDecidedDetails.parse(error.details)).toEqual({ status: 'verified' });
  });

  it('answers 404 to a place that does not exist', async () => {
    const moderator = await signIn('moderator');
    expect((await act(moderator.headers, uuidv7(), 'verify')).statusCode).toBe(404);
  });
});

describe('POST /v1/admin/places/:id/close', () => {
  it('closes the place and marks the published routes that go through it to correct', async () => {
    const moderator = await signIn('moderator');
    const online = await addPlace('Fermé', 'flagged', 'published');
    const offline = await addPlace('Fermé aussi', 'flagged', 'unpublished');
    // A second route through the first place, already out of the catalog: left as it is.
    expect(offline.routeId).not.toBeNull();

    const response = await act(moderator.headers, online.placeId, 'close', {
      reason: 'Fermé définitivement depuis septembre.',
    });

    expect(response.statusCode).toBe(200);
    expect(PlaceActionResult.parse(response.json())).toEqual({
      placeId: online.placeId,
      verificationStatus: 'closed',
      routesToFix: 1,
    });
    expect(await routeStatusOf(online.routeId ?? '')).toBe('needs_fix');
    expect(await routeStatusOf(offline.routeId ?? '')).toBe('unpublished');
    const history = await app.db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.routeId, online.routeId ?? ''));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ action: 'request_changes', actorId: moderator.id });
    expect(history[0]?.message).toContain('Fermé définitivement');
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(
        and(eq(adminActions.targetId, online.placeId), eq(adminActions.action, 'place.close')),
      );
    expect(entry).toMatchObject({
      action: 'place.close',
      reason: 'Fermé définitivement depuis septembre.',
    });
  });

  it('needs a reason, and leaves the place and its routes as they were', async () => {
    const moderator = await signIn('moderator');
    const { placeId, routeId } = await addPlace('Sans motif', 'flagged', 'published');

    expect((await act(moderator.headers, placeId, 'close', {})).statusCode).toBe(422);
    expect(
      (await act(moderator.headers, placeId, 'close', { reason: '<b>x</b>' })).statusCode,
    ).toBe(422);

    const [row] = await app.db.select().from(places).where(eq(places.id, placeId));
    expect(row?.verificationStatus).toBe('flagged');
    expect(await routeStatusOf(routeId ?? '')).toBe('published');
  });

  it('answers 409 already_decided to a place that is already closed', async () => {
    const moderator = await signIn('moderator');
    const { placeId } = await addPlace('Deux fois', 'flagged');
    await act(moderator.headers, placeId, 'close', { reason: 'Fermé.' });

    const response = await act(moderator.headers, placeId, 'close', { reason: 'Encore.' });

    expect(response.statusCode).toBe(409);
    expect(PlaceAlreadyDecidedDetails.parse(ApiError.parse(response.json()).details)).toEqual({
      status: 'closed',
    });
  });

  it('is refused to an editor', async () => {
    const editor = await signIn('editor');
    const { placeId } = await addPlace('Éditeur', 'flagged');
    expect((await act(editor.headers, placeId, 'close', { reason: 'Non.' })).statusCode).toBe(403);
  });
});

describe('GET /v1/admin/ratings', () => {
  it('is empty until ratings exist, and validates its filters', async () => {
    const moderator = await signIn('moderator');

    const response = await app.inject({
      url: `/v1/admin/ratings?rating=2&routeId=${uuidv7()}`,
      headers: moderator.headers,
    });

    expect(response.statusCode).toBe(200);
    expect(AdminRatings.parse(response.json())).toEqual({
      items: [],
      total: 0,
      offset: 0,
      previousCursor: null,
      nextCursor: null,
    });
    const tooHigh = await app.inject({
      url: '/v1/admin/ratings?rating=6',
      headers: moderator.headers,
    });
    expect(tooHigh.statusCode).toBe(400);
  });
});
