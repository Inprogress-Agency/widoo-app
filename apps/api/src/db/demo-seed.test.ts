import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';
import type { Db } from './client';
import {
  demoSeedRefusal,
  gcpProjectId,
  removeDemoDataset,
  runDemoSeed,
  stagingProjectId,
  type DemoSeedTarget,
} from './demo-seed';
import { media, placeHours, places, routes, steps, users } from './schema';
import { demoRouteIds, seedId } from './seed';
import { demoDataset } from './seed/demo-routes';
import { uuidv7 } from './uuid';

const staging: DemoSeedTarget = { optIn: 'staging', projectId: stagingProjectId };
const placeIds = demoDataset.places.map((place) => seedId(`place:${place.key}`));
const authorIds = demoDataset.authors.map((author) => seedId(`user:${author.key}`));
/** Seeds wait for those of the other test files, behind the same lock. */
const seedTimeout = { timeout: 30_000 };

/** A database that fails on any use: proves a refusal comes before the first query. */
const untouchable = new Proxy({} as Db, {
  get: () => {
    throw new Error('The database was used');
  },
});

describe('gcpProjectId', () => {
  const metadata = (body: string, init: ResponseInit = {}) =>
    (async () =>
      new Response(body, {
        headers: { 'Metadata-Flavor': 'Google' },
        ...init,
      })) as unknown as typeof fetch;

  it('reads the project of the metadata server', async () => {
    expect(await gcpProjectId(metadata('widoo-staging\n'))).toBe('widoo-staging');
  });

  it.each([
    ['an error status', metadata('widoo-staging', { status: 404 })],
    ['an answer without the metadata header', metadata('widoo-staging', { headers: {} })],
    ['an answer that is not a project ID', metadata('<html>captive portal</html>')],
    [
      'an unreachable server',
      (async () => {
        throw new TypeError('fetch failed');
      }) as unknown as typeof fetch,
    ],
  ])('is null on %s', async (_, fetchImpl) => {
    expect(await gcpProjectId(fetchImpl)).toBeNull();
  });

  it('is null outside Google Cloud', { timeout: 10_000 }, async () => {
    expect(await gcpProjectId()).toBeNull();
  });
});

describe('demoSeedRefusal', () => {
  it('accepts the opt-in on the staging project only', () => {
    expect(demoSeedRefusal(staging)).toBeNull();
  });

  it.each([undefined, '', '1', 'true', 'production', 'Staging'])(
    'refuses without the opt-in DEMO_SEED=staging (%s)',
    (optIn) => {
      expect(demoSeedRefusal({ ...staging, optIn })).toMatch(/DEMO_SEED=staging is required/);
    },
  );

  it.each(['widoo-production', 'widoo-prod', 'widoo-staging-2'])(
    'refuses another project (%s) even with the opt-in',
    (projectId) => {
      expect(demoSeedRefusal({ ...staging, projectId })).toMatch(/is not widoo-staging: refused/);
    },
  );

  it('refuses an unknown project even with the opt-in', () => {
    expect(demoSeedRefusal({ ...staging, projectId: null })).toMatch(/project unknown/);
  });
});

describe('runDemoSeed', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp(testConfig());
  });
  afterAll(() => app.close());

  it.each(['load', 'remove'] as const)('%s: refused before any query', async (action) => {
    await expect(
      runDemoSeed(action, { ...staging, optIn: undefined }, untouchable),
    ).rejects.toThrow(/DEMO_SEED=staging is required/);
    await expect(
      runDemoSeed(action, { ...staging, projectId: 'widoo-production' }, untouchable),
    ).rejects.toThrow(/widoo-production is not widoo-staging/);
    await expect(runDemoSeed(action, { ...staging, projectId: null }, untouchable)).rejects.toThrow(
      /project unknown/,
    );
  });

  // Every row the seed owns: fixed ids, so a duplicate cannot hide under another id.
  const snapshot = async () => ({
    users: await app.db.select().from(users).where(inArray(users.id, authorIds)).orderBy(users.id),
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

  it('loads the ten routes, and a second run leaves the same state', seedTimeout, async () => {
    expect(await runDemoSeed('load', staging, app.db)).toEqual({ action: 'load', routes: 10 });
    const first = await snapshot();
    expect(await runDemoSeed('load', staging, app.db)).toEqual({ action: 'load', routes: 10 });
    expect(await snapshot()).toEqual(first);

    expect(first.routes).toHaveLength(10);
    expect(first.users).toHaveLength(demoDataset.authors.length);
    expect(first.places).toHaveLength(demoDataset.places.length);
    for (const route of demoDataset.routes) {
      const id = seedId(`route:${route.key}`);
      expect(first.steps.filter((step) => step.routeId === id)).toHaveLength(route.steps.length);
      expect(first.media.filter((photo) => photo.ownerId === id)).toHaveLength(route.photos.length);
    }
  });
});

describe('removeDemoDataset', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp(testConfig());
    await runDemoSeed('load', staging, app.db);
  }, seedTimeout.timeout);
  afterAll(() => app.close());

  class RolledBack extends Error {}
  type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
  /** Other test files read the demo dataset at the same time: the removal is never committed. */
  const inRolledBackTransaction = (run: (tx: Tx) => Promise<void>) =>
    expect(
      app.db.transaction(async (tx) => {
        await run(tx);
        throw new RolledBack();
      }),
    ).rejects.toBeInstanceOf(RolledBack);

  it('removes the demo dataset alone, and a second run removes nothing', seedTimeout, async () => {
    const [paris] = await app.db
      .select({ cityId: places.cityId })
      .from(places)
      .where(eq(places.id, placeIds[0] ?? ''));
    if (!paris) throw new Error('Demo dataset not loaded');
    const sharedPlaceId = placeIds[0] ?? '';
    const otherPlaceId = uuidv7();
    const otherRouteIds = [uuidv7(), uuidv7()];

    await inRolledBackTransaction(async (tx) => {
      // Data that is not the demo dataset: a place of its own, and two routes, one of them on a
      // demo place, with a photo.
      await tx.insert(places).values({
        id: otherPlaceId,
        cityId: paris.cityId,
        name: 'Lieu fictif hors démo',
        category: 'bakery',
        location: { lat: 20, lng: 20 },
        address: 'Adresse fictive',
        verificationStatus: 'verified',
      });
      await tx.insert(routes).values(
        otherRouteIds.map((id) => ({
          id,
          cityId: paris.cityId,
          title: 'Parcours fictif hors démo',
          startLocation: { lat: 20, lng: 20 },
        })),
      );
      await tx.insert(steps).values([
        { routeId: otherRouteIds[0] ?? '', position: 0, placeId: sharedPlaceId, durationMin: 30 },
        { routeId: otherRouteIds[1] ?? '', position: 0, placeId: otherPlaceId, durationMin: 30 },
      ]);
      await tx.insert(media).values({
        ownerType: 'route',
        ownerId: otherRouteIds[0] ?? '',
        storagePath: 'https://images.unsplash.com/photo-fictive',
        width: 800,
        height: 600,
      });

      const removal = await removeDemoDataset(tx);
      expect(removal.routes).toBe(10);
      expect(removal.authors).toBe(demoDataset.authors.length);
      expect(removal.places + removal.placesKept).toBe(demoDataset.places.length);
      expect(removal.placesKept).toBeGreaterThanOrEqual(1);

      const count = async (table: typeof routes | typeof users, ids: string[]) =>
        (await tx.select({ id: table.id }).from(table).where(inArray(table.id, ids))).length;
      expect(await count(routes, demoRouteIds)).toBe(0);
      expect(await count(users, authorIds)).toBe(0);
      expect(
        await tx.select().from(steps).where(inArray(steps.routeId, demoRouteIds)),
      ).toHaveLength(0);
      expect(
        await tx
          .select()
          .from(media)
          .where(and(eq(media.ownerType, 'route'), inArray(media.ownerId, demoRouteIds))),
      ).toHaveLength(0);
      // A demo place stays only while another route uses it.
      const kept = await tx
        .select({ id: places.id })
        .from(places)
        .where(
          and(
            inArray(places.id, placeIds),
            sql`not exists (select 1 from ${steps} where ${steps.placeId} = ${places.id} and ${notInArray(steps.routeId, demoRouteIds)})`,
          ),
        );
      expect(kept).toHaveLength(0);

      // The rest is untouched.
      expect(await count(routes, otherRouteIds)).toBe(2);
      expect(
        await tx
          .select()
          .from(places)
          .where(inArray(places.id, [otherPlaceId, sharedPlaceId])),
      ).toHaveLength(2);
      expect(
        await tx.select().from(media).where(inArray(media.ownerId, otherRouteIds)),
      ).toHaveLength(1);

      expect(await removeDemoDataset(tx)).toEqual({
        routes: 0,
        places: 0,
        placesKept: removal.placesKept,
        authors: 0,
      });
    });
    expect(await app.db.select().from(routes).where(inArray(routes.id, demoRouteIds))).toHaveLength(
      10,
    );
  });
});
