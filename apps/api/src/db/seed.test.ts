import { taxonomies } from '@widoo/shared';
import { and, count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';
import type { BBox } from './geography';
import { media, placeHours, places, routes, steps, users } from './schema';
import { demoRouteIds, seed, seedId } from './seed';
import { assumedZeros, demoDataset } from './seed/demo-routes';

// The CI database is migrated but not seeded: the test seeds it, which is idempotent.
describe('seed', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let cityId: string;
  beforeAll(async () => {
    app = await buildApp(testConfig());
    ({ cityId } = await seed(app.db));
  });
  afterAll(() => app.close());

  const routeId = (key: string) => seedId(`route:${key}`);
  const placeIds = demoDataset.places.map((place) => seedId(`place:${place.key}`));
  const userIds = demoDataset.authors.map((author) => seedId(`user:${author.key}`));

  const routesIn = async (box: BBox) =>
    (
      await app.db
        .select({ id: routes.id })
        .from(routes)
        .where(
          sql`ST_Intersects(${routes.bounds}, ST_MakeEnvelope(${box.west}, ${box.south}, ${box.east}, ${box.north}, 4326)::geography)`,
        )
    ).map((route) => route.id);

  it('finds the demo routes of a zone with ST_Intersects on routes.bounds', async () => {
    const marais = { west: 2.355, south: 48.85, east: 2.37, north: 48.865 };
    const lyon = { west: 4.8, south: 45.7, east: 4.9, north: 45.8 };
    expect(await routesIn(marais)).toEqual(
      expect.arrayContaining([routeId('marais-a-l-abri'), routeId('marais-gourmand')]),
    );
    expect(await routesIn(marais)).not.toContain(routeId('belleville-street-art'));
    expect(await routesIn(lyon)).toEqual(expect.not.arrayContaining(demoRouteIds));
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
      .where(eq(routes.id, routeId('marais-a-l-abri')));
    expect(route).toEqual({
      startLocation: { lat: 48.8548, lng: 2.36614 },
      bounds: { west: 2.36168, south: 48.8548, east: 2.36614, north: 48.8628 },
      lng: 2.36614,
      srid: 4326,
    });
  });

  // What a map card needs (E-01): published, located, a cover photo and a duration.
  it('publishes the ten routes with a start, a cover photo and a duration', async () => {
    const rows = await app.db
      .select({
        status: routes.status,
        startLocation: routes.startLocation,
        durationBucket: routes.durationBucket,
        durationMin: sql<number>`(${routes.computed}->>'duration_min')::int`,
        cover: media.storagePath,
      })
      .from(routes)
      .leftJoin(
        media,
        and(eq(media.ownerType, 'route'), eq(media.ownerId, routes.id), eq(media.position, 0)),
      )
      .where(inArray(routes.id, demoRouteIds));
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row.status).toBe('published');
      expect(row.startLocation).not.toBeNull();
      expect(row.durationBucket).not.toBeNull();
      expect(row.durationMin).toBeGreaterThan(0);
      expect(row.cover).toMatch(/^https:\/\/images\.unsplash\.com\//);
    }
  });

  // Criterion of #32, with the operators of the central search query (wiki Modele-de-Donnees).
  describe('answers every filter value, except the assumed zeros', () => {
    const filters: Record<
      keyof typeof assumedZeros | 'audiences' | 'moods' | 'conditions',
      {
        values: readonly string[];
        where: (value: string) => SQL;
      }
    > = {
      audiences: {
        values: taxonomies.audiences,
        where: (value) => sql`${routes.audiences} && array[${value}]::text[]`,
      },
      moods: {
        values: taxonomies.moods,
        where: (value) => sql`${routes.moods} && array[${value}]::text[]`,
      },
      conditions: {
        values: taxonomies.conditions,
        where: (value) => sql`${routes.conditions} @> array[${value}]::text[]`,
      },
      durations: {
        values: taxonomies.durations,
        where: (value) => sql`${routes.durationBucket}::text = ${value}`,
      },
      budgets: {
        values: taxonomies.budgets,
        where: (value) => sql`${routes.budgetBucket}::text = ${value}`,
      },
      transports: {
        values: taxonomies.transports,
        where: (value) => sql`${routes.transport}::text = ${value}`,
      },
    };
    const zerosOf: Partial<Record<keyof typeof filters, readonly string[]>> = assumedZeros;

    it.each(Object.keys(filters) as (keyof typeof filters)[])('%s', async (group) => {
      const { values, where } = filters[group];
      for (const value of values) {
        const [row] = await app.db
          .select({ routes: count() })
          .from(routes)
          .where(
            and(inArray(routes.id, demoRouteIds), eq(routes.status, 'published'), where(value)),
          );
        const isZero = zerosOf[group]?.includes(value) ?? false;
        expect(row?.routes === 0, `${group} ${value}: ${row?.routes} routes`).toBe(isZero);
      }
    });
  });

  it('leaves the database identical on a second run', async () => {
    const snapshot = async () => ({
      users: await app.db.select().from(users).where(inArray(users.id, userIds)).orderBy(users.id),
      places: await app.db
        .select()
        .from(places)
        .where(inArray(places.id, placeIds))
        .orderBy(places.id),
      hours: await app.db
        .select()
        .from(placeHours)
        .where(inArray(placeHours.placeId, placeIds))
        .orderBy(placeHours.id),
      routes: await app.db
        .select()
        .from(routes)
        .where(inArray(routes.id, demoRouteIds))
        .orderBy(routes.id),
      steps: await app.db
        .select()
        .from(steps)
        .where(inArray(steps.routeId, demoRouteIds))
        .orderBy(steps.id),
      media: await app.db
        .select()
        .from(media)
        .where(inArray(media.ownerId, demoRouteIds))
        .orderBy(media.id),
    });
    const before = await snapshot();
    await seed(app.db);
    expect(await snapshot()).toEqual(before);
    expect(before.routes).toHaveLength(10);
    expect(before.steps).toHaveLength(
      demoDataset.routes.reduce((sum, route) => sum + route.steps.length, 0),
    );
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
