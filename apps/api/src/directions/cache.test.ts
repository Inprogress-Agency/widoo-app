import { computeTransitions, type Directions, type DirectionsLeg } from '@widoo/orchestration';
import { lt } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb, createSql, type Db } from '../db/client';
import { directionCache } from '../db/schema';
import { testConfig } from '../test-config';
import { createDirectionsCache, forgetTripsOf } from './cache';

const sql = createSql(testConfig().databaseUrl);
const db = createDb(sql);
afterAll(async () => {
  await clear();
  await sql.end();
});

// Fictitious points around 40° S, which no other test file uses.
const a = { lat: -40.1234567, lng: 70.1234567 };
const b = { lat: -40.2, lng: 70.2 };
const c = { lat: -40.3, lng: 70.3 };
const clear = () => db.delete(directionCache).where(lt(directionCache.fromLatE5, -3_000_000));

const day = 24 * 60 * 60 * 1000;
const at = new Date('2026-10-13T10:00:00Z');
const answer: Directions = { distanceM: 1432.6, durationS: 1150.4, geometry: 'o~qiHkpvM`@yA' };
const walk = (from = a, to = b): DirectionsLeg => ({ from, to, profile: 'walking' });

beforeEach(clear);

describe('createDirectionsCache', () => {
  it('reads a trip again with its geometry and duration, by rounded points', async () => {
    const cache = createDirectionsCache(db, { ttlMs: 30 * day, now: () => at });
    await cache.set(walk(), answer);
    const nearby = { lat: a.lat + 0.000001, lng: a.lng - 0.000001 };
    expect(await cache.get(walk(nearby))).toEqual({
      distanceM: 1433,
      durationS: 1150,
      geometry: answer.geometry,
    });
    expect(await cache.get({ ...walk(), profile: 'cycling' })).toBeUndefined();
    expect(await cache.get(walk(b, a))).toBeUndefined();
  });

  it('stops reading a trip once expired, and refreshes it when written again', async () => {
    let now = at;
    const cache = createDirectionsCache(db, { ttlMs: day, now: () => now });
    await cache.set(walk(), answer);
    now = new Date(at.getTime() + day);
    expect(await cache.get(walk())).toBeUndefined();
    await cache.set(walk(), { ...answer, durationS: 900 });
    expect(await cache.get(walk())).toMatchObject({ durationS: 900 });
  });

  it('reports a failing database as a miss and drops the write', async () => {
    const onError = vi.fn();
    const failing = new Proxy({} as Db, {
      get: () => () => {
        throw new Error('database down');
      },
    });
    const cache = createDirectionsCache(failing, { ttlMs: day, onError });
    expect(await cache.get(walk())).toBeUndefined();
    await expect(cache.set(walk(), answer)).resolves.toBeUndefined();
    expect(onError.mock.calls.map(([, operation]) => operation)).toEqual(['read', 'write']);
  });
});

describe('forgetTripsOf', () => {
  it('deletes the trips from and to the former point of a moved place, in every profile', async () => {
    const cache = createDirectionsCache(db, { ttlMs: day, now: () => new Date() });
    await cache.set(walk(a, b), answer);
    await cache.set({ ...walk(c, a), profile: 'driving' }, answer);
    await cache.set(walk(b, c), answer);
    await forgetTripsOf(db, a);
    expect(await cache.get(walk(a, b))).toBeUndefined();
    expect(await cache.get({ ...walk(c, a), profile: 'driving' })).toBeUndefined();
    expect(await cache.get(walk(b, c))).toEqual({
      distanceM: 1433,
      durationS: 1150,
      geometry: answer.geometry,
    });
  });
});

describe('computeTransitions over the Postgres cache', () => {
  it('asks Mapbox once, then reads the trip and its geometry from the table', async () => {
    const cache = createDirectionsCache(db, { ttlMs: day, now: () => new Date() });
    const directions = { route: vi.fn(async () => answer) };
    const steps = [
      { location: a, mode: 'walk' as const },
      { location: b, mode: null },
    ];
    const first = await computeTransitions(steps, { directions, cache });
    const again = await computeTransitions(steps, { directions, cache });
    expect(directions.route).toHaveBeenCalledTimes(1);
    expect(again).toEqual(first);
    expect(again[0]).toMatchObject({ durationMin: 19, geometry: answer.geometry });
  });
});
