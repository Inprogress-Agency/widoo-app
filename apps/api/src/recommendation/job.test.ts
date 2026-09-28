import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { places, routes, steps } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';
import { recomputeRecommendations } from './job';
import { StoredRecommendation } from './stable';

let app: Awaited<ReturnType<typeof buildApp>>;

// Shared database, parallel files: fictitious rows around 20° N, 20° E, recomputed by id only,
// so that the seed and the other files keep their values.
const placeIds = { verified: uuidv7(), stale: uuidv7(), flagged: uuidv7() };
const routeIds = { rated: uuidv7(), flagged: uuidv7(), draft: uuidv7() };
const updatedAt = new Date('2026-01-02T03:04:05.000Z');
const now = new Date('2026-09-28T02:00:00.000Z');

beforeAll(async () => {
  app = await buildApp(testConfig());
  const { cityId } = await seed(app.db);
  const location = { lat: 20, lng: 20 };
  await app.db.insert(places).values(
    (['verified', 'stale', 'flagged'] as const).map((status) => ({
      id: placeIds[status],
      cityId,
      name: `Lieu fictif ${status}`,
      category: status === 'verified' ? ('bakery' as const) : ('museum' as const),
      location,
      address: 'Adresse fictive',
      verificationStatus: status,
    })),
  );
  const route = (id: string, overrides: Partial<typeof routes.$inferInsert>) => ({
    id,
    cityId,
    status: 'published' as const,
    title: 'Parcours fictif',
    startLocation: location,
    updatedAt,
    ...overrides,
  });
  await app.db.insert(routes).values([
    route(routeIds.rated, {
      isOfficial: true,
      stats: { rating_avg: 5, rating_count: 20 },
      publishedAt: new Date('2026-09-20T00:00:00Z'),
    }),
    route(routeIds.flagged, { publishedAt: new Date('2026-01-01T00:00:00Z') }),
    route(routeIds.draft, { status: 'draft' }),
  ]);
  await app.db.insert(steps).values([
    { routeId: routeIds.rated, position: 0, placeId: placeIds.verified, durationMin: 30 },
    { routeId: routeIds.rated, position: 1, placeId: placeIds.stale, durationMin: 30 },
    { routeId: routeIds.flagged, position: 0, placeId: placeIds.stale, durationMin: 30 },
    { routeId: routeIds.flagged, position: 1, placeId: placeIds.flagged, durationMin: 30 },
  ]);
});
afterAll(async () => {
  await app.db.delete(routes).where(inArray(routes.id, Object.values(routeIds)));
  await app.db.delete(places).where(inArray(places.id, Object.values(placeIds)));
  await app.close();
});

const storedOf = async () => {
  const rows = await app.db
    .select({ id: routes.id, recommendation: routes.recommendation, updatedAt: routes.updatedAt })
    .from(routes)
    .where(inArray(routes.id, Object.values(routeIds)));
  return new Map(rows.map((row) => [row.id, row]));
};

describe('recomputeRecommendations', () => {
  it('writes the stable components of the published routes into routes.recommendation', async () => {
    expect(
      await recomputeRecommendations(app.db, { now, routeIds: Object.values(routeIds) }),
    ).toEqual({ updated: 2 });
    const stored = await storedOf();

    const rated = StoredRecommendation.parse(stored.get(routeIds.rated)?.recommendation);
    expect(rated).toMatchObject({
      rated: true,
      reliability: 0.75,
      freshness: 1,
      official: 1,
      moments: ['morning', 'midday'],
      computed_at: now.toISOString(),
    });
    // 20 ratings of 5 outweigh the prior, whatever the other routes of the database.
    expect(rated.quality).toBeGreaterThan(0.85);

    const flagged = StoredRecommendation.parse(stored.get(routeIds.flagged)?.recommendation);
    expect(flagged).toMatchObject({
      quality: 0.5,
      rated: false,
      reliability: 0,
      official: 0,
      moments: ['morning', 'midday', 'afternoon'],
    });
    expect(flagged.freshness).toBe(0);

    expect(stored.get(routeIds.draft)?.recommendation).toBeNull();
  });

  it('leaves updated_at alone: the column is derived, not an edit of the route', async () => {
    await recomputeRecommendations(app.db, { now, routeIds: Object.values(routeIds) });
    for (const row of (await storedOf()).values()) expect(row.updatedAt).toEqual(updatedAt);
  });

  it('does nothing for an empty list of routes', async () => {
    expect(await recomputeRecommendations(app.db, { now, routeIds: [] })).toEqual({ updated: 0 });
  });
});
