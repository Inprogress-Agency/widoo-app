import { count, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';
import type { BBox } from './geography';
import { routes, steps } from './schema';
import { seed, seedRouteId } from './seed';

// The CI database is migrated but not seeded: the test seeds it, which is idempotent.
describe('seed', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let cityId: string;
  beforeAll(async () => {
    app = await buildApp(testConfig());
    ({ cityId } = await seed(app.db));
  });
  afterAll(() => app.close());

  const routesIn = (box: BBox) =>
    app.db
      .select({ id: routes.id })
      .from(routes)
      .where(
        sql`ST_Intersects(${routes.bounds}, ST_MakeEnvelope(${box.west}, ${box.south}, ${box.east}, ${box.north}, 4326)::geography)`,
      );

  it('finds the seed route with ST_Intersects on routes.bounds', async () => {
    const marais = { west: 2.36, south: 48.855, east: 2.365, north: 48.86 };
    const lyon = { west: 4.8, south: 45.7, east: 4.9, north: 45.8 };
    expect((await routesIn(marais)).map((route) => route.id)).toContain(seedRouteId);
    expect((await routesIn(lyon)).map((route) => route.id)).not.toContain(seedRouteId);
  });

  it('writes and reads geographies as longitude, latitude in WGS 84', async () => {
    const [route] = await app.db
      .select({
        startLocation: routes.startLocation,
        bounds: routes.bounds,
        lng: sql<number>`ST_X(${routes.startLocation}::geometry)`,
        srid: sql<number>`ST_SRID(${routes.startLocation})`,
      })
      .from(routes)
      .where(eq(routes.id, seedRouteId));
    expect(route).toEqual({
      startLocation: { lat: 48.8575, lng: 2.3615 },
      bounds: { west: 2.3615, south: 48.8548, east: 2.366, north: 48.8601 },
      lng: 2.3615,
      srid: 4326,
    });
  });

  it('inserts nothing on a second run', async () => {
    await seed(app.db);
    const [row] = await app.db
      .select({ steps: count() })
      .from(steps)
      .where(eq(steps.routeId, seedRouteId));
    expect(row?.steps).toBe(4);
  });

  it('lets the database refuse a mood outside the taxonomy', async () => {
    const insert = app.db
      .insert(routes)
      // @ts-expect-error: the French label, not the key; the type already refuses it.
      .values({ cityId, title: 'Parcours invalide', moods: ['Romantique'] });
    await expect(insert).rejects.toMatchObject({
      cause: { constraint_name: 'routes_moods_check' },
    });
  });
});
