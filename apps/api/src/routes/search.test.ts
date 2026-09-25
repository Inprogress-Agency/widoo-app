import {
  ApiError,
  RouteCount,
  RouteSearchResult,
  type BudgetBucket,
  type DurationBucket,
} from '@widoo/shared';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { routes } from '../db/schema';
import { demoRouteIds, seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

let app: Awaited<ReturnType<typeof buildApp>>;

// Shared database, parallel files: the seed is idempotent and locked; the fixtures below sit in
// a zone of their own, far from Paris, and are deleted afterwards.
const fixtureIds: string[] = [];
beforeAll(async () => {
  app = await buildApp(testConfig());
  const { cityId } = await seed(app.db);
  await app.db.insert(routes).values(fixtures.map((fixture) => fixtureRow(fixture, cityId)));
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
      budget_per_person_eur: { min: 0, max: 0 },
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
    ['recommended', ['e', 'd', 'c', 'b', 'a']],
  ])('sorts by %s', async (sort, expected) => {
    expect(keysOf(await search(`${zone}&sort=${sort}`))).toEqual(expected);
  });

  it.each(['duration', 'rating', 'distance&near=10.021,10.021', 'recommended'])(
    'pages by %s with a cursor, without gap or repeat',
    async (sort) => {
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
    },
  );

  it('counts without each group', async () => {
    expect(await count(`${zone}&budgets[]=high&durations[]=1_2h&breakdown=all_but_one`)).toEqual({
      count: 0,
      without: { durations: 2, budgets: 2 },
    });
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
