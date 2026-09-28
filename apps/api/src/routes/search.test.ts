import {
  ApiError,
  RouteCount,
  RouteSearchResult,
  type BudgetBucket,
  type DurationBucket,
} from '@widoo/shared';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app';
import { routes, settings, steps, users } from '../db/schema';
import { demoRouteIds, seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { weightsKey } from '../recommendation/weights';
import { testConfig } from '../test-config';

let app: Awaited<ReturnType<typeof buildApp>>;

// Shared database, parallel files: the seed is idempotent and locked; the fixtures below sit in
// a zone of their own, far from Paris, and are deleted afterwards.
const fixtureIds: string[] = [];
const privateAuthorUid = `search-private-${uuidv7()}`;
beforeAll(async () => {
  app = await buildApp(testConfig());
  const { cityId } = await seed(app.db);
  const [author] = await app.db
    .insert(users)
    .values({ firebaseUid: privateAuthorUid, firstName: 'Profil privé', isPublic: false })
    .returning({ id: users.id });
  await app.db
    .insert(routes)
    .values(
      fixtures.map((fixture) => ({ ...fixtureRow(fixture, cityId), authorId: author?.id ?? null })),
    );
  // Microseconds, which a JavaScript date would round: the cursor must still tell them apart.
  for (const fixture of fixtures) {
    await app.db
      .update(routes)
      .set({ publishedAt: sql`${fixture.publishedAt}::timestamptz` })
      .where(eq(routes.id, fixtureIdOf(fixture.key)));
  }
});
afterAll(async () => {
  await app.db.delete(routes).where(inArray(routes.id, fixtureIds));
  await app.db.delete(users).where(eq(users.firebaseUid, privateAuthorUid));
  await app.close();
});

const search = async (query: string) => {
  const response = await app.inject({ url: `/v1/routes/search?${query}` });
  expect(response.statusCode, response.body).toBe(200);
  return RouteSearchResult.parse(response.json());
};
const count = async (query: string) => {
  const response = await app.inject({ url: `/v1/routes/search/count?${query}` });
  expect(response.statusCode, response.body).toBe(200);
  return RouteCount.parse(response.json());
};
const refusal = async (url: string) => {
  const response = await app.inject({ url });
  expect(response.statusCode).toBe(400);
  return ApiError.parse(response.json());
};

const demo = (key: string) => seedId(`route:${key}`);
/** Ids of the demo routes, in answer order: other routes of the database are left out. */
const demoIdsOf = (result: RouteSearchResult) =>
  result.items.map((item) => item.id).filter((id) => demoRouteIds.includes(id));

/** About 6 × 6 km over central Paris: every demo route but the Butte-aux-Cailles. */
const central = 'bbox=2.32,48.835,2.40,48.89&limit=50';
const allParis = 'bbox=2.2241,48.8156,2.4699,48.9022';

describe('GET /v1/routes/search on the seed', () => {
  it('filters by mood', async () => {
    expect(demoIdsOf(await search(`${central}&moods[]=food`))).toEqual([demo('marais-gourmand')]);
  });

  it('keeps routes with any of the moods', async () => {
    const ids = demoIdsOf(await search(`${central}&moods[]=food&moods[]=nature`));
    expect(ids.sort()).toEqual(
      [
        'marais-gourmand',
        'coulee-verte-bois-de-vincennes',
        'buttes-chaumont-guignol',
        'jardin-des-plantes-en-famille',
      ]
        .map(demo)
        .sort(),
    );
  });

  it('keeps only routes with every condition', async () => {
    const ids = demoIdsOf(await search(`${central}&conditions[]=indoor&conditions[]=rainy`));
    expect(ids.sort()).toEqual(['marais-a-l-abri', 'de-la-cite-a-montparnasse'].map(demo).sort());
  });

  it('combines groups with and', async () => {
    const result = await search(
      `${central}&moods[]=culture&audiences[]=family&audiences[]=solo&budgets[]=medium`,
    );
    expect(demoIdsOf(result).sort()).toEqual(
      ['jardin-des-plantes-en-famille', 'de-la-cite-a-montparnasse'].map(demo).sort(),
    );
  });

  it('answers nothing outside the zone of the routes', async () => {
    // About 2.3 × 2.2 km in Lyon: small enough to list, and empty.
    const lyon = await search('bbox=4.83,45.75,4.86,45.77');
    expect(lyon).toEqual({ items: [], nextCursor: null, clusters: null });
  });

  it('answers clusters and no card for a zone too large', async () => {
    const result = await search(`${allParis}&moods[]=food`);
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
    const clustered = result.clusters?.reduce((sum, cluster) => sum + cluster.count, 0);
    expect(clustered).toBe((await count(`${allParis}&moods[]=food`)).count);
    expect(clustered).toBeGreaterThanOrEqual(2);
  });

  it('builds the card of a route', async () => {
    const result = await search(`bbox=2.355,48.85,2.37,48.865&moods[]=food`);
    const card = result.items.find((item) => item.id === demo('marais-gourmand'));
    expect(card).toMatchObject({
      title: 'Le Marais gourmand en deux heures',
      isOfficial: true,
      author: null,
      isVerified: true,
      moods: ['food', 'shopping'],
      district: '3e',
      neighborhood: 'Le Marais',
      durationBucket: '1_2h',
      budgetBucket: 'medium',
      rating: { average: null, count: 0 },
    });
    expect(card?.coverUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(card?.steps.map((step) => step.category)).toEqual([
      'shop',
      'restaurant',
      'shop',
      'shop',
    ]);
    expect(card).toMatchObject({ isLocked: false, stepCount: 4 });
    // Step line of the map tooltip: place name and time on the spot.
    expect(card?.steps[0]).toMatchObject({ name: 'Merci', durationMin: 30 });
    expect(card?.steps.at(-1)).toMatchObject({ name: 'Berthillon', durationMin: 20 });
  });

  it('names the author of a community route', async () => {
    const result = await search(`${central}&audiences[]=dog_friendly`);
    const card = result.items.find((item) => item.id === demo('belleville-street-art'));
    expect(card?.isOfficial).toBe(false);
    expect(card?.author).toMatchObject({ firstName: expect.any(String), avatarUrl: null });
  });

  it('serves a public answer for 30 s with an ETag, and 304 when it has not changed', async () => {
    const first = await app.inject({ url: `/v1/routes/search?${central}` });
    expect(first.headers['cache-control']).toBe('public, max-age=30');
    const etag = String(first.headers.etag);
    expect(etag).toMatch(/^"[\w-]+"$/);
    const again = await app.inject({
      url: `/v1/routes/search?${central}`,
      headers: { 'if-none-match': etag },
    });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe('');
    const refused = await app.inject({ url: '/v1/routes/search?bbox=1' });
    expect(refused.headers['cache-control'] ?? '').not.toContain('public');
  });
});

describe('GET /v1/routes/search on a Premium route (D-014)', () => {
  // A Premium copy of a demo route, same places and steps, on a zone of its own far from Paris:
  // the demo route is left untouched, and the answer holds the copy alone.
  const premiumId = uuidv7();
  fixtureIds.push(premiumId);
  const premiumZone = 'bbox=19.99,19.99,20.01,20.01';
  const marais = 'bbox=2.355,48.85,2.37,48.865&moods[]=food';

  beforeAll(async () => {
    const [demoRoute] = await app.db
      .select()
      .from(routes)
      .where(eq(routes.id, demo('marais-gourmand')));
    if (!demoRoute) throw new Error('Demo route missing from the seed');
    const start = { lat: 20, lng: 20 };
    await app.db.insert(routes).values({
      ...demoRoute,
      id: premiumId,
      access: 'premium',
      startLocation: start,
      bounds: { west: 20, south: 20, east: 20.001, north: 20.001 },
    });
    const demoSteps = await app.db
      .select()
      .from(steps)
      .where(eq(steps.routeId, demo('marais-gourmand')));
    await app.db
      .insert(steps)
      .values(demoSteps.map((step) => ({ ...step, id: uuidv7(), routeId: premiumId })));
  });

  it('carries the start alone, unnamed, and counts every step', async () => {
    const free = (await search(marais)).items.find((item) => item.id === demo('marais-gourmand'));
    const [card] = (await search(premiumZone)).items;
    expect(card).toMatchObject({ id: premiumId, access: 'premium', isLocked: true, stepCount: 4 });
    expect(card?.durationMin).toBe(free?.durationMin);
    expect(card?.steps).toEqual([
      { category: 'shop', location: free?.steps[0]?.location, name: null, durationMin: null },
    ]);
  });

  it('sends no place, coordinate or category of the steps after the start', async () => {
    const free = (await search(marais)).items.find((item) => item.id === demo('marais-gourmand'));
    const hidden = free?.steps.slice(1) ?? [];
    expect(hidden).toHaveLength(3);
    const response = await app.inject({ url: `/v1/routes/search?${premiumZone}` });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=30');
    for (const step of hidden) {
      expect(response.body).not.toContain(String(step.location.lat));
      expect(response.body).not.toContain(String(step.location.lng));
      expect(response.body).not.toContain(String(step.name));
    }
    expect(response.body).not.toContain('restaurant');
  });
});

describe('GET /v1/routes/search/count on the seed', () => {
  it('counts the routes of the search', async () => {
    expect(await count(`${central}&conditions[]=indoor&conditions[]=rainy`)).toEqual({
      count: expect.any(Number),
    });
  });

  it('breaks the count down without each active group, group by group', async () => {
    const query = `${central}&moods[]=food&moods[]=romantic&durations[]=weekend&audiences[]=couple`;
    const result = await count(`${query}&breakdown=all_but_one`);
    expect(result.count).toBe(0);
    expect(Object.keys(result.without ?? {})).toEqual(['audiences', 'moods', 'durations']);
    expect(result.without?.durations).toBe(
      (await count(`${central}&moods[]=food&moods[]=romantic&audiences[]=couple`)).count,
    );
    expect(result.without?.durations).toBeGreaterThanOrEqual(3);
  });

  it('breaks nothing down without an active filter', async () => {
    const result = await count(`${central}&breakdown=all_but_one`);
    expect(result.without).toEqual({});
    expect(result.count).toBe((await count(central)).count);
  });
});

type Fixture = {
  key: string;
  lng: number;
  lat: number;
  durationMin: number;
  durationBucket: DurationBucket;
  budgetBucket: BudgetBucket;
  rating: { avg: number; count: number } | null;
  publishedAt: string;
};

/** Five routes on an empty zone around 10° N, 10° E: every sort gives a different order. */
const fixtures: Fixture[] = [
  {
    key: 'a',
    lng: 10.001,
    lat: 10.001,
    durationMin: 600,
    durationBucket: 'full_day',
    budgetBucket: 'high',
    rating: { avg: 4.5, count: 10 },
    publishedAt: '2026-09-01T10:00:00.000001Z',
  },
  {
    key: 'b',
    lng: 10.005,
    lat: 10.005,
    durationMin: 90,
    durationBucket: '1_2h',
    budgetBucket: 'low',
    rating: { avg: 3, count: 4 },
    publishedAt: '2026-09-01T10:00:00.000002Z',
  },
  {
    key: 'c',
    lng: 10.01,
    lat: 10.01,
    durationMin: 200,
    durationBucket: 'half_day',
    budgetBucket: 'medium',
    rating: null,
    publishedAt: '2026-09-03T10:00:00Z',
  },
  {
    key: 'd',
    lng: 10.015,
    lat: 10.015,
    durationMin: 400,
    durationBucket: 'full_day',
    budgetBucket: 'high',
    rating: { avg: 4.5, count: 2 },
    publishedAt: '2026-09-04T10:00:00Z',
  },
  {
    key: 'e',
    lng: 10.02,
    lat: 10.02,
    durationMin: 60,
    durationBucket: '1_2h',
    budgetBucket: 'free',
    rating: { avg: 5, count: 1 },
    publishedAt: '2026-09-05T10:00:00Z',
  },
];
const fixtureId = new Map(fixtures.map((fixture) => [fixture.key, uuidv7()]));
fixtureIds.push(...fixtureId.values());
function fixtureIdOf(key: string): string {
  const id = fixtureId.get(key);
  if (!id) throw new Error(`Unknown fixture ${key}`);
  return id;
}

function fixtureRow(fixture: Fixture, cityId: string): typeof routes.$inferInsert {
  const location = { lat: fixture.lat, lng: fixture.lng };
  return {
    id: fixtureIdOf(fixture.key),
    cityId,
    status: 'published',
    title: `Parcours fictif ${fixture.key}`,
    moods: ['culture'],
    audiences: ['solo'],
    startLocation: location,
    bounds: {
      west: fixture.lng,
      south: fixture.lat,
      east: fixture.lng + 0.001,
      north: fixture.lat + 0.001,
    },
    computed: {
      duration_min: fixture.durationMin,
      budget_per_person_eur: 0,
      distance_m: 1000,
    },
    durationBucket: fixture.durationBucket,
    budgetBucket: fixture.budgetBucket,
    stats: fixture.rating
      ? { rating_avg: fixture.rating.avg, rating_count: fixture.rating.count }
      : {},
  };
}

const zone = 'bbox=9.99,9.99,10.03,10.03';
const keysOf = (result: RouteSearchResult) =>
  result.items.map(
    (item) => fixtures.find((fixture) => fixtureId.get(fixture.key) === item.id)?.key,
  );

describe('GET /v1/routes/search on fixtures', () => {
  it('filters the budget key high, with or without brackets', async () => {
    expect(keysOf(await search(`${zone}&budgets[]=high&sort=duration`))).toEqual(['d', 'a']);
    expect(keysOf(await search(`${zone}&budgets=high&sort=duration`))).toEqual(['d', 'a']);
  });

  it.each([
    ['duration', ['e', 'b', 'c', 'd', 'a']],
    ['rating', ['e', 'a', 'd', 'b', 'c']],
    ['distance&near=10.021,10.021', ['e', 'd', 'c', 'b', 'a']],
    // Proximity first, then the Bayesian quality: `a` has the best rating, far from the position.
    ['recommended&near=10.021,10.021', ['e', 'd', 'c', 'a', 'b']],
  ])('sorts by %s', async (sort, expected) => {
    expect(keysOf(await search(`${zone}&sort=${sort}`))).toEqual(expected);
  });

  it.each([
    'duration',
    'rating',
    'distance&near=10.021,10.021',
    'recommended',
    'recommended&near=10.021,10.021',
  ])('pages by %s with a cursor, without gap or repeat', async (sort) => {
    const all = keysOf(await search(`${zone}&sort=${sort}`));
    const paged: (string | undefined)[] = [];
    let cursor: string | null = null;
    do {
      const page: RouteSearchResult = await search(
        `${zone}&sort=${sort}&limit=2${cursor ? `&cursor=${cursor}` : ''}`,
      );
      paged.push(...keysOf(page));
      cursor = page.nextCursor;
    } while (cursor);
    expect(paged).toEqual(all);
  });

  it('hides the author of a non public profile (D-025)', async () => {
    const result = await search(zone);
    expect(result.items).toHaveLength(fixtures.length);
    for (const card of result.items) {
      expect(card.isOfficial).toBe(false);
      expect(card.author).toBeNull();
    }
  });

  it('counts without each group', async () => {
    expect(await count(`${zone}&budgets[]=high&durations[]=1_2h&breakdown=all_but_one`)).toEqual({
      count: 0,
      without: { durations: 2, budgets: 2 },
    });
  });
});

describe('GET /v1/routes/search?sort=recommended on fixtures (#63)', () => {
  const near = `${zone}&near=10.021,10.021`;

  it('gives each card its main reason, the distance when near the position', async () => {
    const result = await search(near);
    expect(result.items[0]?.reason).toEqual({ key: 'near_you', distanceM: expect.any(Number) });
    const distance = result.items[0]?.reason?.key === 'near_you' ? result.items[0].reason : null;
    expect(distance?.distanceM).toBeGreaterThan(100);
    expect(distance?.distanceM).toBeLessThan(250);
    for (const card of result.items) expect(card.reason).not.toBeUndefined();
  });

  it('says nothing is near without a position, and gives no reason with another sort', async () => {
    for (const card of (await search(zone)).items) {
      expect(card.reason?.key).not.toBe('near_you');
    }
    for (const card of (await search(`${zone}&sort=rating`)).items) {
      expect(card.reason).toBeUndefined();
    }
  });

  it('changes the order when a weight changes in settings, without a restart', async () => {
    const weights = { proximity: 0, quality: 1, freshness: 0 };
    // The weights are read again once a minute: the clock moves on instead of the test waiting.
    const realNow = Date.now.bind(Date);
    let offsetMs = 0;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => realNow() + offsetMs);
    try {
      expect(keysOf(await search(near))).toEqual(['e', 'd', 'c', 'a', 'b']);
      await app.db
        .insert(settings)
        .values({ key: weightsKey, value: weights })
        .onConflictDoUpdate({ target: settings.key, set: { value: weights } });
      offsetMs = 61_000;
      // Quality alone: `a` (4.5 over 10 ratings) first, then `d`, `e`; `b` and `c` tie at 0.5.
      const byQuality = keysOf(await search(near));
      expect(byQuality.slice(0, 3)).toEqual(['a', 'd', 'e']);
      expect(byQuality.slice(3).sort()).toEqual(['b', 'c']);
    } finally {
      await app.db.delete(settings).where(eq(settings.key, weightsKey));
      offsetMs = 122_000;
      expect(keysOf(await search(near))).toEqual(['e', 'd', 'c', 'a', 'b']);
      clock.mockRestore();
    }
  });
});

describe('search query validation', () => {
  it.each([
    ['the former budget key premium', `${central}&budgets[]=premium`, 'budgets'],
    ['an unknown key', `${central}&mood=food`, ''],
    ['an indexed key', `${central}&moods[0]=food`, ''],
    ['a limit above 50', 'bbox=2.32,48.835,2.40,48.89&limit=51', 'limit'],
    ['a distance sort without position', `${central}&sort=distance`, 'near'],
  ])('refuses %s with validation_error', async (_, query, path) => {
    const error = await refusal(`/v1/routes/search?${query}`);
    expect(error.code).toBe('validation_error');
    expect(error.details?.issues).toEqual([
      expect.objectContaining({ location: 'querystring', path }),
    ]);
  });

  it('refuses the former budget key on the count too', async () => {
    expect((await refusal(`/v1/routes/search/count?${central}&budgets[]=premium`)).code).toBe(
      'validation_error',
    );
  });

  it('refuses a forged cursor or the cursor of another sort', async () => {
    const page = await search(`${zone}&sort=rating&limit=1`);
    expect(page.nextCursor).not.toBeNull();
    for (const url of [
      `/v1/routes/search?${zone}&sort=duration&cursor=${page.nextCursor}`,
      `/v1/routes/search?${zone}&sort=rating&cursor=${Buffer.from('{"sort":"rating","keys":["1)--",1,"x"]}').toString('base64url')}`,
    ]) {
      expect(await refusal(url)).toEqual({ code: 'validation_error', message: 'Invalid cursor' });
    }
  });
});
