import { describe, expect, it } from 'vitest';
import { roundedPoint, straightLineM } from './geo';

describe('straightLineM', () => {
  it('measures about 1.1 km between the Louvre and Notre-Dame', () => {
    const louvre = { lat: 48.8606, lng: 2.3376 };
    const notreDame = { lat: 48.853, lng: 2.3499 };
    expect(straightLineM(louvre, notreDame)).toBeGreaterThan(1150);
    expect(straightLineM(louvre, notreDame)).toBeLessThan(1250);
  });

  it('is zero from a point to itself', () => {
    expect(straightLineM({ lat: 48.86, lng: 2.35 }, { lat: 48.86, lng: 2.35 })).toBe(0);
  });
});

describe('roundedPoint', () => {
  it('keeps five decimals, about a meter', () => {
    expect(roundedPoint({ lat: 48.8606123, lng: 2.3376789 })).toEqual({
      lat: 48.86061,
      lng: 2.33768,
    });
  });
});
