import { describe, expect, it } from 'vitest';
import {
  bboxCenter,
  boundsOf,
  distanceBetweenM,
  parisCenter,
  scaleBbox,
  toBbox,
  zoomForSpan,
} from './geo';

describe('boundsOf', () => {
  it('holds every point, and nothing without point', () => {
    const points = [
      { lat: 48.88, lng: 2.34 },
      { lat: 48.86, lng: 2.36 },
      { lat: 48.87, lng: 2.33 },
    ];
    expect(boundsOf(points)).toEqual({ ne: [2.36, 48.88], sw: [2.33, 48.86] });
    expect(boundsOf([{ lat: 48.8, lng: 2.3 }])).toEqual({ ne: [2.3, 48.8], sw: [2.3, 48.8] });
    expect(boundsOf([])).toBeNull();
  });
});

describe('toBbox', () => {
  it('turns the corners into the zone of the search', () => {
    expect(toBbox({ ne: [2.37, 48.88], sw: [2.33, 48.85] })).toEqual({
      west: 2.33,
      south: 48.85,
      east: 2.37,
      north: 48.88,
    });
  });
});

describe('zoomForSpan', () => {
  it('fits 3 km in the width of a phone at the latitude of Paris', () => {
    const zoom = zoomForSpan(parisCenter, 3000, 402);
    const metersPerPoint =
      (40_075_016.686 * Math.cos((parisCenter.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    expect(metersPerPoint * 402).toBeCloseTo(3000, 6);
    expect(zoom).toBeGreaterThan(12);
    expect(zoom).toBeLessThan(13);
  });

  it('zooms in by one level for half the span', () => {
    expect(zoomForSpan(parisCenter, 1500, 402) - zoomForSpan(parisCenter, 3000, 402)).toBeCloseTo(
      1,
      9,
    );
  });
});

describe('scaleBbox', () => {
  const zone = { west: 2.33, south: 48.85, east: 2.37, north: 48.87 };

  it('doubles the zone around its centre', () => {
    const wider = scaleBbox(zone, 2);
    expect(bboxCenter(wider)[0]).toBeCloseTo(2.35);
    expect(bboxCenter(wider)[1]).toBeCloseTo(48.86);
    expect(wider.east - wider.west).toBeCloseTo(0.08);
    expect(wider.north - wider.south).toBeCloseTo(0.04);
  });

  it('stays within the coordinates the search accepts', () => {
    expect(scaleBbox({ west: -170, south: -80, east: 170, north: 80 }, 2)).toEqual({
      west: -180,
      south: -90,
      east: 180,
      north: 90,
    });
  });
});

describe('distanceBetweenM', () => {
  it('measures a straight line on the Earth, zero from a point to itself', () => {
    const republique = { lat: 48.8674, lng: 2.3636 };
    const bastille = { lat: 48.8532, lng: 2.3692 };
    expect(distanceBetweenM(republique, republique)).toBe(0);
    expect(distanceBetweenM(republique, bastille)).toBeCloseTo(1633, -1);
    expect(distanceBetweenM(bastille, republique)).toBeCloseTo(
      distanceBetweenM(republique, bastille),
    );
  });
});
