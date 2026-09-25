/**
 * `pnpm --filter api bench:search`: p95 of the route search on 1 000 synthetic routes (#25).
 *
 * Inserts 1 000 fictitious published routes over Paris, each with 3 to 5 places of its own within
 * about a kilometre, and fixed ids (a second
 * run replaces them), runs a mix of the requests the app sends through the whole API, prints
 * p50 / p95 / p99 per request and overall, then deletes its rows. `--explain` also prints the
 * execution plans of the central search and of the count. Refused in production. Exits 1 when
 * the overall p95 reaches 150 ms.
 */
import {
  budgetBucketOf,
  durationBucketOf,
  RouteCountQuery,
  RouteSearchQuery,
  taxonomies,
} from '@widoo/shared';
import { inArray, sql } from 'drizzle-orm';
import { performance } from 'node:perf_hooks';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { envelopeOf } from '../db/geography';
import { places, routes, steps } from '../db/schema';
import { seed } from '../db/seed';
import { namedUuidv7 } from '../db/uuid';
import { countSql, searchPageSql } from './repository';
import { sortKeys } from './sort';

const routeCount = 1000;
const maxSteps = 5;
const warmup = 50;
const rounds = 60;
const budgetMs = 150;
const paris = { west: 2.25, south: 48.815, east: 2.42, north: 48.9 };
const benchTime = Date.parse('2026-01-01T00:00:00Z');
const benchId = (name: string) => namedUuidv7(`widoo-bench:${name}`, benchTime);
const routeIds = Array.from({ length: routeCount }, (_, i) => benchId(`route:${i}`));
const placeIds = routeIds.flatMap((_, i) =>
  Array.from({ length: maxSteps }, (_, position) => benchId(`place:${i}:${position}`)),
);

/** Deterministic pseudo-random numbers (mulberry32): the same data on every run. */
function random(seedValue: number) {
  let state = seedValue;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const next = random(25);
const pick = <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)] as T;
const some = <T>(values: readonly T[], max: number): T[] => [
  ...new Set(Array.from({ length: 1 + Math.floor(next() * max) }, () => pick(values))),
];
const between = (min: number, max: number) => min + next() * (max - min);

// No request is authenticated: a demo Firebase project is enough when none is configured.
const config = loadConfig({
  FIREBASE_PROJECT_ID: 'demo-widoo-bench',
  ...process.env,
  LOG_LEVEL: 'silent',
  RATE_LIMIT_MAX: '1000000',
});
if (config.isProduction) {
  throw new Error('bench:search inserts fictitious routes: refused with NODE_ENV=production');
}
const app = await buildApp(config);

async function removeBenchRows() {
  await app.db.delete(routes).where(inArray(routes.id, routeIds));
  await app.db.delete(places).where(inArray(places.id, placeIds));
}

function benchRoute(index: number, cityId: string) {
  const id = routeIds[index] ?? '';
  const center = { lat: between(paris.south, paris.north), lng: between(paris.west, paris.east) };
  const stops = Array.from({ length: 3 + Math.floor(next() * (maxSteps - 2)) }, (_, position) => ({
    id: placeIds[index * maxSteps + position] ?? '',
    cityId,
    name: `Lieu fictif ${index}-${position}`,
    category: pick(taxonomies.placeCategories),
    location: {
      lat: center.lat + between(-0.008, 0.008),
      lng: center.lng + between(-0.012, 0.012),
    },
    address: 'Adresse fictive, Paris',
    addressComponents: { arrondissement: `${1 + (index % 20)}e`, neighborhood: 'Quartier fictif' },
    verificationStatus: pick(['verified', 'verified', 'stale', 'flagged'] as const),
  }));
  const durationMin = Math.round(between(45, 900));
  const budget = pick([0, 12, 40, 95]);
  const route = {
    id,
    cityId,
    isOfficial: next() < 0.3,
    status: 'published' as const,
    title: `Parcours fictif ${index}`,
    moods: some(taxonomies.moods, 3),
    audiences: some(taxonomies.audiences, 3),
    conditions: next() < 0.3 ? [] : some(taxonomies.conditions, 3),
    transport: pick(taxonomies.transports),
    startLocation: stops[0]?.location,
    bounds: envelopeOf(stops.map((stop) => stop.location)),
    computed: {
      duration_min: durationMin,
      budget_per_person_eur: { min: budget, max: budget },
      distance_m: Math.round(between(500, 8000)),
    },
    durationBucket: durationBucketOf(durationMin),
    budgetBucket: budgetBucketOf(budget),
    stats:
      next() < 0.6 ? { rating_avg: between(1, 5), rating_count: 1 + Math.floor(next() * 50) } : {},
    publishedAt: new Date(benchTime - Math.floor(next() * 3e10)),
  };
  const routeSteps = stops.map((stop, position) => ({
    id: benchId(`step:${index}:${position}`),
    routeId: id,
    position,
    placeId: stop.id,
    durationMin: 30,
  }));
  return { places: stops, route, steps: routeSteps };
}

async function insertBenchRows(cityId: string) {
  for (let start = 0; start < routeCount; start += 200) {
    const batch = Array.from({ length: 200 }, (_, offset) => benchRoute(start + offset, cityId));
    await app.db.insert(places).values(batch.flatMap((item) => item.places));
    await app.db.insert(routes).values(batch.map((item) => item.route));
    await app.db.insert(steps).values(batch.flatMap((item) => item.steps));
  }
  await app.db.execute(sql`analyze routes, steps, places`);
}

/** Requests of the map and the filter panel, around République (about 3 × 3 km). */
const zone = 'bbox=2.345,48.855,2.385,48.88';
const requests: Record<string, string> = {
  'search, no filter': `/v1/routes/search?${zone}`,
  'search, mood': `/v1/routes/search?${zone}&moods[]=food&moods[]=culture`,
  'search, combination': `/v1/routes/search?${zone}&moods[]=culture&audiences[]=couple&conditions[]=no_booking&budgets[]=low&budgets[]=medium`,
  'search, distance, 50': `/v1/routes/search?${zone}&sort=distance&near=48.867,2.363&limit=50`,
  'search, rating': `/v1/routes/search?${zone}&sort=rating`,
  'search, clusters': `/v1/routes/search?bbox=${paris.west},${paris.south},${paris.east},${paris.north}&moods[]=nature`,
  count: `/v1/routes/search/count?${zone}&moods[]=food&durations[]=half_day`,
  'count, all_but_one': `/v1/routes/search/count?${zone}&moods[]=food&conditions[]=indoor&budgets[]=high&durations[]=weekend&breakdown=all_but_one`,
};

const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? Number.NaN;
const format = (ms: number) => `${ms.toFixed(1).padStart(6)} ms`;

async function time(url: string): Promise<number> {
  const started = performance.now();
  const response = await app.inject({ url });
  const elapsed = performance.now() - started;
  if (response.statusCode !== 200)
    throw new Error(`${url}: ${response.statusCode} ${response.body}`);
  return elapsed;
}

async function explain() {
  const search = RouteSearchQuery.parse({
    bbox: zone.slice('bbox='.length),
    moods: ['food', 'culture'],
    conditions: ['no_booking'],
  });
  const count = RouteCountQuery.parse({
    bbox: zone.slice('bbox='.length),
    moods: ['food'],
    durations: ['half_day'],
  });
  const plans = {
    'search, mood and condition': searchPageSql(
      search,
      sortKeys(search.sort, undefined),
      undefined,
    ),
    'count, mood and duration': countSql(count),
  };
  for (const [name, query] of Object.entries(plans)) {
    const rows = await app.db.execute<{ 'QUERY PLAN': string }>(
      sql`explain (analyze, buffers, costs off) ${query}`,
    );
    console.info(`\n--- ${name}\n${rows.map((row) => row['QUERY PLAN']).join('\n')}`);
  }
}

try {
  const { cityId } = await seed(app.db);
  await removeBenchRows();
  await insertBenchRows(cityId);
  const [row] = await app.db.execute<{ count: number }>(
    sql`select count(*)::int as count from routes where status = 'published'`,
  );
  console.info(`Published routes: ${row?.count}`);

  const urls = Object.values(requests);
  for (let i = 0; i < warmup; i++) await time(urls[i % urls.length] ?? '');
  const byRequest = new Map<string, number[]>(Object.keys(requests).map((name) => [name, []]));
  for (let round = 0; round < rounds; round++) {
    for (const [name, url] of Object.entries(requests)) byRequest.get(name)?.push(await time(url));
  }

  console.info(`\n${'request'.padEnd(24)}      p50        p95        p99`);
  const all: number[] = [];
  for (const [name, samples] of byRequest) {
    const sorted = samples.toSorted((a, b) => a - b);
    all.push(...samples);
    console.info(
      `${name.padEnd(24)} ${format(percentile(sorted, 50))} ${format(percentile(sorted, 95))} ${format(percentile(sorted, 99))}`,
    );
  }
  const sorted = all.toSorted((a, b) => a - b);
  const p95 = percentile(sorted, 95);
  console.info(
    `${'overall'.padEnd(24)} ${format(percentile(sorted, 50))} ${format(p95)} ${format(percentile(sorted, 99))}  (${sorted.length} requests)`,
  );
  if (process.argv.includes('--explain')) await explain();
  if (p95 >= budgetMs) {
    console.error(`\np95 ${p95.toFixed(1)} ms: above the ${budgetMs} ms budget`);
    process.exitCode = 1;
  }
} finally {
  await removeBenchRows();
  await app.close();
}
