import { describe, expect, it } from 'vitest';
import { googleMapsUrl } from './maps';

// Fictitious points.
const a = { lat: 48.86, lng: 2.35 };
const b = { lat: 48.87, lng: 2.36 };
const c = { lat: 48.88, lng: 2.37 };

describe('googleMapsUrl', () => {
  it('goes through every step to the last one, from where the user is', () => {
    const url = new URL(googleMapsUrl([a, b, c], 'walk') ?? '');
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('destination')).toBe('48.88,2.37');
    expect(url.searchParams.get('waypoints')).toBe('48.86,2.35|48.87,2.36');
    expect(url.searchParams.get('travelmode')).toBe('walking');
    expect(url.searchParams.has('origin')).toBe(false);
  });

  it('takes the mode of the route, and nothing without a step', () => {
    expect(new URL(googleMapsUrl([a], 'bike') ?? '').searchParams.get('travelmode')).toBe(
      'bicycling',
    );
    expect(new URL(googleMapsUrl([a], 'bike') ?? '').searchParams.has('waypoints')).toBe(false);
    expect(googleMapsUrl([], 'walk')).toBeNull();
  });
});
