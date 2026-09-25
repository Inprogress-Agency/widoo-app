import { size } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import { clusterPoints, clusterRadius } from './clusters';

describe('clusterRadius', () => {
  it('never draws a disc smaller than a touch target, and grows with the count', () => {
    expect(clusterRadius(1) * 2).toBe(size['touch-min']);
    expect(clusterRadius(9)).toBeLessThan(clusterRadius(10));
    expect(clusterRadius(99)).toBeLessThan(clusterRadius(100));
    expect(clusterRadius(5000)).toBe(clusterRadius(100));
  });
});

describe('clusterPoints', () => {
  it('places a disc per cluster, longitude first, with its count', () => {
    const points = clusterPoints([
      { center: { lat: 48.86, lng: 2.34 }, count: 12 },
      { center: { lat: 48.88, lng: 2.36 }, count: 3 },
    ]);
    expect(points.features.map((feature) => feature.geometry.coordinates)).toEqual([
      [2.34, 48.86],
      [2.36, 48.88],
    ]);
    expect(points.features.map((feature) => feature.properties.label)).toEqual(['12', '3']);
    expect(new Set(points.features.map((feature) => feature.properties.clusterId)).size).toBe(2);
  });
});
