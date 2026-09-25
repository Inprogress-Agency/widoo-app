import type { RouteCard, RouteSearchResult } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import {
  effectiveSort,
  isSectionId,
  mergePages,
  serverSort,
  sortByDistance,
  zoneRadiusM,
} from './sections';

// Fictitious routes around Paris.
function route(id: string, start: { lat: number; lng: number } | null = null): RouteCard {
  return {
    id,
    title: `Parcours ${id}`,
    coverUrl: null,
    isOfficial: false,
    author: null,
    access: 'free',
    isVerified: false,
    moods: [],
    audiences: [],
    district: null,
    neighborhood: null,
    durationMin: 60,
    durationBucket: '1_2h',
    budgetPerPersonEur: { min: 0, max: 0 },
    budgetBucket: 'free',
    distanceM: 1000,
    rating: { average: null, count: 0 },
    steps: start ? [{ category: 'park', location: start }] : [],
  };
}

const page = (ids: string[], nextCursor: string | null = null): RouteSearchResult => ({
  items: ids.map((id) => route(id)),
  nextCursor,
  clusters: null,
});

const ids = (routes: readonly RouteCard[]) => routes.map((r) => r.id);

describe('isSectionId', () => {
  it('knows the sections of the sheet only', () => {
    expect(isSectionId('nearby')).toBe(true);
    expect(isSectionId('weather')).toBe(false);
    expect(isSectionId(undefined)).toBe(false);
  });
});

describe('sorts', () => {
  it('falls back to recommended for the distance without position', () => {
    expect(effectiveSort('distance', false)).toBe('recommended');
    expect(effectiveSort('distance', true)).toBe('distance');
    expect(effectiveSort('rating', false)).toBe('rating');
  });

  it('never asks the API for the distance sort, which needs the position', () => {
    expect(serverSort('distance')).toBe('recommended');
    expect(serverSort('duration')).toBe('duration');
  });
});

describe('mergePages', () => {
  it('keeps the order of the pages, each route once', () => {
    const merged = mergePages([page(['a', 'b'], 'c1'), page(['b', 'c'], 'c2'), page(['d'])]);
    expect(ids(merged)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('holds 200 routes over ten pages without loss', () => {
    const pages = Array.from({ length: 10 }, (_, p) =>
      page(Array.from({ length: 20 }, (_, i) => `r${p * 20 + i}`)),
    );
    expect(new Set(ids(mergePages(pages))).size).toBe(200);
  });
});

describe('sortByDistance', () => {
  const user = { lat: 48.8675, lng: 2.3637 };

  it('orders the starts from the nearest, a route without step last', () => {
    const far = route('far', { lat: 48.88, lng: 2.34 });
    const near = route('near', { lat: 48.868, lng: 2.364 });
    const none = route('none');
    const middle = route('middle', { lat: 48.872, lng: 2.37 });
    expect(ids(sortByDistance([none, far, near, middle], user))).toEqual([
      'near',
      'middle',
      'far',
      'none',
    ]);
  });

  it('keeps the recommended order between equal distances', () => {
    const spot = { lat: 48.87, lng: 2.36 };
    expect(ids(sortByDistance([route('b', spot), route('a', spot)], user))).toEqual(['b', 'a']);
  });
});

describe('zoneRadiusM', () => {
  it('measures from the centre to the nearest edge of the zone', () => {
    // About 3 km wide and 4.4 km tall: the half width is the radius.
    const radius = zoneRadiusM({ west: 2.343, south: 48.847, east: 2.384, north: 48.887 });
    expect(radius).toBeGreaterThan(1450);
    expect(radius).toBeLessThan(1550);
  });
});
