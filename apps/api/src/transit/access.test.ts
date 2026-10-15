import { describe, expect, it } from 'vitest';
import { demoDataset } from '../db/seed/demo-routes';
import { accessColumnOf, ACCESS_MAX_M, nearestAccess } from './access';
import type { TransitStation } from './stations';

const abbesses = { lat: 48.88459, lng: 2.33795 };
const stations: TransitStation[] = [
  {
    id: '1',
    lines: [{ mode: 'metro', line: '12' }],
    stops: [{ name: 'Abbesses', ...abbesses }],
  },
  {
    id: '2',
    lines: [
      { mode: 'metro', line: '2' },
      { mode: 'metro', line: '12' },
    ],
    stops: [
      { name: 'Pigalle', lat: 48.88218, lng: 2.33727 },
      { name: 'Pigalle', lat: 48.88197, lng: 2.33707 },
    ],
  },
];

describe('nearestAccess', () => {
  it('names the stop nearest the start, every line of its station and the walk to it', () => {
    const access = nearestAccess({ lat: 48.8845, lng: 2.3385 }, stations);
    expect(access).toMatchObject({ station: 'Abbesses', lines: [{ mode: 'metro', line: '12' }] });
    // About 41 m in a straight line, walked × 1.3.
    expect(access?.distanceM).toBeGreaterThan(45);
    expect(access?.distanceM).toBeLessThan(60);
  });

  it('measures to the nearest stop of a station with several', () => {
    const access = nearestAccess({ lat: 48.8819, lng: 2.337 }, stations);
    expect(access?.station).toBe('Pigalle');
    expect(access?.lines.map((line) => line.line)).toEqual(['2', '12']);
    expect(access?.distanceM).toBeLessThan(20);
  });

  it('gives none beyond a walk, nor without any station', () => {
    // Saint-Germain-en-Laye forest: far from both demo stations.
    expect(nearestAccess({ lat: 48.92, lng: 2.08 }, stations)).toBeNull();
    expect(nearestAccess(abbesses, [])).toBeNull();
    expect(ACCESS_MAX_M).toBe(1500);
  });
});

describe('accessColumnOf', () => {
  it('stores the access in snake case, and none without a start', () => {
    expect(accessColumnOf({ lat: 48.88459, lng: 2.33795 })).toEqual({
      station: 'Abbesses',
      lines: [{ mode: 'metro', line: '12' }],
      distance_m: 0,
    });
    expect(accessColumnOf(null)).toBeNull();
  });

  it('finds a station near the start of every demo route, in the reference file', () => {
    const places = new Map(demoDataset.places.map((place) => [place.key, place.location]));
    for (const route of demoDataset.routes) {
      const start = places.get(route.steps[0]?.place ?? '');
      const access = accessColumnOf(start);
      expect(access, route.key).not.toBeNull();
      expect(access?.distance_m, route.key).toBeLessThan(1000);
    }
  });
});
