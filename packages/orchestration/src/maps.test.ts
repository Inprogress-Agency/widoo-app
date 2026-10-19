import { describe, expect, it } from 'vitest';
import { stepMapsUrl, travelModeOf, type MapsStep } from './maps';

/** Four steps near République, carrying the mode of each trip to the next one. */
const steps = [
  { place: { location: { lat: 48.8674, lng: 2.3636 } }, transition: { mode: 'bike' } },
  { place: { location: { lat: 48.8714, lng: 2.3676 } }, transition: { mode: 'metro' } },
  { place: { location: { lat: 48.8754, lng: 2.3716 } }, transition: { mode: 'car' } },
  { place: { location: { lat: 48.8794, lng: 2.3756 } }, transition: null },
] as const satisfies readonly MapsStep[];

describe('travelModeOf', () => {
  it('maps each transport to the travel mode of Google Maps', () => {
    expect(travelModeOf('walk')).toBe('walking');
    expect(travelModeOf('bike')).toBe('bicycling');
    expect(travelModeOf('metro')).toBe('transit');
    expect(travelModeOf('car')).toBe('driving');
  });
});

describe('stepMapsUrl', () => {
  it('opens the first step on foot, no trip of the route leads to it', () => {
    expect(stepMapsUrl(steps, 0)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=48.8674%2C2.3636&travelmode=walking',
    );
  });

  it('opens the next steps in the mode of the trip that leads to them', () => {
    expect(stepMapsUrl(steps, 1)).toContain('travelmode=bicycling');
    expect(stepMapsUrl(steps, 2)).toContain('travelmode=transit');
    expect(stepMapsUrl(steps, 3)).toContain('travelmode=driving');
  });

  it('opens on foot a step whose trip carries no mode', () => {
    const modeless = [
      { place: { location: { lat: 48.8674, lng: 2.3636 } }, transition: null },
      { place: { location: { lat: 48.8714, lng: 2.3676 } }, transition: null },
    ] as const satisfies readonly MapsStep[];
    expect(stepMapsUrl(modeless, 1)).toContain('travelmode=walking');
  });

  it('always takes one destination, never the whole route', () => {
    expect(stepMapsUrl(steps, 2)).toContain('destination=48.8754%2C2.3716&');
    expect(stepMapsUrl(steps, 2)).not.toContain('waypoints');
  });
});
