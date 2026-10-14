import type { LatLng } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { nearestNeighbourOrder, pathLengthM, reorderOf } from './order';

/** Points on a parallel of Paris, `km` kilometers east of the first (about 0.0136° a km). */
const east = (km: number): LatLng => ({ lat: 48.86, lng: 2.33 + km * 0.0136 });

describe('nearestNeighbourOrder', () => {
  it('keeps the first step and goes to the closest step left', () => {
    expect(nearestNeighbourOrder([east(0), east(3), east(1), east(2)])).toEqual([0, 2, 3, 1]);
  });

  it('keeps the earlier of two steps as close, and handles no step', () => {
    expect(nearestNeighbourOrder([east(1), east(0), east(2)])).toEqual([0, 1, 2]);
    expect(nearestNeighbourOrder([])).toEqual([]);
  });
});

describe('pathLengthM', () => {
  it('adds the straight lines in the order given', () => {
    const points = [east(0), east(1), east(2)];
    expect(pathLengthM(points, [0, 1, 2]) / 1000).toBeCloseTo(2, 1);
    expect(pathLengthM(points, [0, 2, 1]) / 1000).toBeCloseTo(3, 1);
  });
});

describe('reorderOf', () => {
  it('proposes the nearest-neighbour order beyond 50 % more', () => {
    // 0 → 3 → 1 → 2 km: 3 + 2 + 1 = 6 km, against 3 km in order: 100 % more.
    expect(reorderOf([east(0), east(3), east(1), east(2)], 0.5)).toEqual([0, 2, 3, 1]);
  });

  it('proposes nothing up to 50 % more', () => {
    // 0 → 2 → 1 → 3 km: 2 + 1 + 2 = 5 km, against 3 km: 67 % more, under a threshold of 70 %.
    expect(reorderOf([east(0), east(2), east(1), east(3)], 0.7)).toBeNull();
    expect(reorderOf([east(0), east(1), east(2)], 0.5)).toBeNull();
  });

  it('proposes nothing under three steps, nor for steps at one place', () => {
    expect(reorderOf([east(0), east(5)], 0.5)).toBeNull();
    expect(reorderOf([east(0), east(0), east(0)], 0.5)).toBeNull();
  });
});
