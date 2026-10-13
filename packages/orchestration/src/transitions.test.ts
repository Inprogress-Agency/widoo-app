import type { LatLng } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  DirectionsUnavailable,
  type Directions,
  type DirectionsCache,
  type DirectionsLeg,
  type DirectionsProvider,
} from './directions';
import { straightLineM } from './geo';
import { computeTransitions, proposedMode, type TransitionStep } from './transitions';

// Fictional points in Paris: about 1.2 km, then about 3.3 km apart.
const louvre: LatLng = { lat: 48.8606, lng: 2.3376 };
const notreDame: LatLng = { lat: 48.853, lng: 2.3499 };
const bastille: LatLng = { lat: 48.8532, lng: 2.3692 };
const montmartre: LatLng = { lat: 48.8867, lng: 2.3431 };

const answer: Directions = { distanceM: 1432.6, durationS: 1150, geometry: 'o~qiHkpvM`@yA' };

const keyOf = (leg: DirectionsLeg) =>
  `${leg.profile}:${leg.from.lat},${leg.from.lng};${leg.to.lat},${leg.to.lng}`;

function memoryCache(entries: [DirectionsLeg, Directions][] = []) {
  const stored = new Map(entries.map(([leg, directions]) => [keyOf(leg), directions]));
  const cache: DirectionsCache = {
    get: vi.fn(async (leg: DirectionsLeg) => stored.get(keyOf(leg))),
    set: vi.fn(async (leg: DirectionsLeg, directions: Directions) => {
      stored.set(keyOf(leg), directions);
    }),
  };
  return { cache, stored };
}

function provider(route: (leg: DirectionsLeg) => Promise<Directions> = async () => answer) {
  const directions: DirectionsProvider = { route: vi.fn(route) };
  return directions;
}

const trip = (from: LatLng, to: LatLng, mode: TransitionStep['mode']): TransitionStep[] => [
  { location: from, mode },
  { location: to, mode: null },
];

describe('computeTransitions', () => {
  it.each([
    ['walk', 'walking'],
    ['bike', 'cycling'],
    ['car', 'driving'],
  ] as const)('asks the %s trip with the %s profile, geometry included', async (mode, profile) => {
    const directions = provider();
    const [transition, last] = await computeTransitions(trip(louvre, notreDame, mode), {
      directions,
      cache: null,
    });
    expect(directions.route).toHaveBeenCalledWith({ from: louvre, to: notreDame, profile });
    expect(transition).toEqual({
      distanceM: 1433,
      durationMin: 19,
      mode,
      estimated: false,
      geometry: answer.geometry,
    });
    expect(last).toBeNull();
  });

  it('estimates the metro by its coefficient, without the provider and without geometry', async () => {
    const directions = provider();
    const [transition] = await computeTransitions(trip(louvre, montmartre, 'metro'), {
      directions,
      cache: null,
    });
    expect(directions.route).not.toHaveBeenCalled();
    const distanceM = straightLineM(louvre, montmartre) * 1.4;
    expect(transition).toEqual({
      distanceM: Math.round(distanceM),
      durationMin: Math.round(distanceM / (20_000 / 60) + 8),
      mode: 'metro',
      estimated: false,
    });
  });

  it('proposes walking up to 1.5 km and the metro beyond when no mode is chosen', async () => {
    const steps: TransitionStep[] = [
      { location: louvre, mode: null },
      { location: notreDame, mode: null },
      { location: montmartre, mode: null },
    ];
    const transitions = await computeTransitions(steps, { directions: provider(), cache: null });
    expect(transitions.map((transition) => transition?.mode ?? null)).toEqual([
      'walk',
      'metro',
      null,
    ]);
    expect(proposedMode(1500)).toBe('walk');
    expect(proposedMode(1501)).toBe('metro');
  });

  it('reads a cached trip, geometry and duration included, without asking the provider', async () => {
    const leg: DirectionsLeg = { from: louvre, to: notreDame, profile: 'walking' };
    const { cache } = memoryCache([[leg, answer]]);
    const directions = provider();
    const [transition] = await computeTransitions(trip(louvre, notreDame, 'walk'), {
      directions,
      cache,
    });
    expect(directions.route).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(transition).toMatchObject({ durationMin: 19, geometry: answer.geometry });
  });

  it('caches the answer of the provider with its geometry, by rounded points and profile', async () => {
    const { cache, stored } = memoryCache();
    const directions = provider();
    const precise = { lat: 48.8606049, lng: 2.3375951 };
    await computeTransitions(trip(precise, notreDame, 'bike'), { directions, cache });
    const leg: DirectionsLeg = { from: louvre, to: notreDame, profile: 'cycling' };
    expect(directions.route).toHaveBeenCalledWith(leg);
    expect(stored.get(keyOf(leg))).toEqual(answer);
    // The same trip on foot is another entry.
    expect(await cache.get({ ...leg, profile: 'walking' })).toBeUndefined();
  });

  it('falls back to 1.3 times the straight line at 4.5 km/h, estimated, uncached, without geometry', async () => {
    const { cache } = memoryCache();
    const directions = provider(async () => {
      throw new DirectionsUnavailable();
    });
    const [transition] = await computeTransitions(trip(notreDame, bastille, 'walk'), {
      directions,
      cache,
    });
    const distanceM = straightLineM(notreDame, bastille) * 1.3;
    expect(transition).toEqual({
      distanceM: Math.round(distanceM),
      durationMin: Math.round(distanceM / (4_500 / 60)),
      mode: 'walk',
      estimated: true,
    });
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('falls back without any provider set up, keeping the chosen mode', async () => {
    const [transition] = await computeTransitions(trip(louvre, notreDame, 'car'), {
      directions: null,
      cache: null,
    });
    expect(transition).toMatchObject({ mode: 'car', estimated: true });
    expect(transition).not.toHaveProperty('geometry');
  });

  it('lets an unexpected error of the provider through', async () => {
    const directions = provider(async () => {
      throw new TypeError('bug');
    });
    await expect(
      computeTransitions(trip(louvre, notreDame, 'walk'), { directions, cache: null }),
    ).rejects.toThrow(TypeError);
  });

  it('counts no trip between two steps at the same point', async () => {
    const directions = provider();
    const [transition] = await computeTransitions(trip(louvre, louvre, 'walk'), {
      directions,
      cache: null,
    });
    expect(directions.route).not.toHaveBeenCalled();
    expect(transition).toEqual({ distanceM: 0, durationMin: 0, mode: 'walk', estimated: false });
  });

  it('answers nothing for no step and a null for a single one', async () => {
    const transport = { directions: provider(), cache: null };
    expect(await computeTransitions([], transport)).toEqual([]);
    expect(await computeTransitions([{ location: louvre, mode: 'walk' }], transport)).toEqual([
      null,
    ]);
  });
});
