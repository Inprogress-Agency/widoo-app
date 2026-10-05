import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';
import type { Db } from './client';
import {
  demoSeedRefusal,
  gcpProjectId,
  runDemoSeed,
  stagingProjectId,
  type DemoSeedTarget,
} from './demo-seed';
import { media, placeHours, places, routes, steps, users } from './schema';
import { demoRouteIds, seedId } from './seed';
import { demoDataset } from './seed/demo-routes';

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

  it.each(['load'] as const)('%s: refused before any query', async (action) => {
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
