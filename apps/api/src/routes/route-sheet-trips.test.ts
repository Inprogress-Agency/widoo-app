import {
  DirectionsUnavailable,
  type DirectionsLeg,
  type DirectionsProvider,
} from '@widoo/orchestration';
import { RouteDetail } from '@widoo/shared';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { directionCache, routes, steps } from '../db/schema';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// The exact trips of the sheet (D-088): a fake provider in place of Mapbox, never the network.
// On copies of the demo route; everything is deleted afterwards.
const legs: DirectionsLeg[] = [];
let isDown = false;
const line = 'a~l~Fjk~uOwHJ';
const provider: DirectionsProvider = {
  route: async (leg) => {
    legs.push(leg);
    if (isDown) throw new DirectionsUnavailable();
    return { distanceM: 1000, durationS: 600, geometry: line };
  },
};

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());
const sheetOf = (body: string) => RouteDetail.parse(JSON.parse(body));
/** Rows of `direction_cache` from the start of one of these legs: other files write theirs. */
const cachedTripsOf = async (asked: readonly DirectionsLeg[]) => {
  const e5 = (degrees: number) => Math.round(degrees * 100_000);
  const rows = await Promise.all(
    asked.map(({ from }) =>
      app.db
        .select({ count: sql<number>`count(*)::int` })
        .from(directionCache)
        .where(
          and(
            eq(directionCache.fromLatE5, e5(from.lat)),
            eq(directionCache.fromLngE5, e5(from.lng)),
          ),
        ),
    ),
  );
  return rows.reduce((total, [row]) => total + (row?.count ?? 0), 0);
};

beforeAll(async () => {
  app = await buildApp(testConfig(), { directions: provider });
});
beforeEach(() => {
  legs.length = 0;
  isDown = false;
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

describe('GET /v1/routes/:id, the trips of the answer (D-088)', () => {
  it('serves the trips and lines of the provider, and stores none of them', async () => {
    const id = await fixtures.copyDemoRoute();
    const [before] = await app.db.select().from(routes).where(eq(routes.id, id));
    const storedTrips = await app.db.select().from(steps).where(eq(steps.routeId, id));

    const response = await app.inject({ url: `/v1/routes/${id}` });
    expect(response.statusCode).toBe(200);
    const sheet = sheetOf(response.body);
    const trips = sheet.steps.slice(0, -1).map((step) => step.transition);
    expect(legs).toHaveLength(trips.length);
    expect(legs.every((leg) => leg.profile === 'walking')).toBe(true);
    expect(trips).toEqual(
      trips.map(() => ({
        distanceM: 1000,
        durationMin: 10,
        mode: 'walk',
        estimated: false,
        geometry: line,
      })),
    );
    // Duration, distances and timeline of the trips served (Q6); the buckets stay stored.
    const stayMin = sheet.steps.reduce((total, step) => total + step.durationMin, 0);
    expect(sheet.durationMin).toBe(stayMin + 10 * trips.length);
    expect(sheet.distanceM).toBe(1000 * trips.length);
    expect(sheet.walkingDistanceM).toBe(1000 * trips.length);
    expect(sheet.durationBucket).toBe(before?.durationBucket);
    const { startsAt, endsAt } = sheet.timeline;
    expect(Date.parse(endsAt) - Date.parse(startsAt)).toBe(sheet.durationMin * 60_000);

    const [after] = await app.db.select().from(routes).where(eq(routes.id, id));
    expect(after?.computed).toEqual(before?.computed);
    expect(await app.db.select().from(steps).where(eq(steps.routeId, id))).toEqual(storedTrips);
    expect(await cachedTripsOf(legs)).toBe(0);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('falls back to our estimates, without a line, when the provider is down', async () => {
    isDown = true;
    const id = await fixtures.copyDemoRoute();
    const response = await app.inject({ url: `/v1/routes/${id}` });
    expect(response.statusCode).toBe(200);
    const trips = sheetOf(response.body).steps.flatMap((step) => step.transition ?? []);
    expect(trips.length).toBeGreaterThan(0);
    for (const trip of trips) expect(trip).toMatchObject({ estimated: true, geometry: null });
  });

  it('asks nothing of the provider with trips=estimated', async () => {
    const id = await fixtures.copyDemoRoute();
    const sheet = sheetOf((await app.inject({ url: `/v1/routes/${id}?trips=estimated` })).body);
    expect(legs).toEqual([]);
    expect(sheet.steps.every((step) => (step.transition?.geometry ?? null) === null)).toBe(true);
  });

  it('asks nothing of the provider for a Premium route locked to the caller (Q7)', async () => {
    const id = await fixtures.copyDemoRoute({ access: 'premium' });
    const sheet = sheetOf((await app.inject({ url: `/v1/routes/${id}` })).body);
    expect(sheet.isLocked).toBe(true);
    expect(legs).toEqual([]);
    expect(sheet.steps.every((step) => (step.transition?.geometry ?? null) === null)).toBe(true);
  });
});
