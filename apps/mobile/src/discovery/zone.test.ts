import { describe, expect, it } from 'vitest';
import type { Bbox } from '../map/geo';
import { isSearchableZone } from './zone';

// Zones the Android emulator reported on a cold start (issue #286), rounded.
/** The opening view on Paris, about 3 km across. */
const paris: Bbox = { west: 2.33174, south: 48.82666, east: 2.37266, north: 48.88653 };
/** Same longitude and zoom, but a latitude of 0: the map before its camera reached Paris. */
const parisOnEquator: Bbox = { west: 2.33174, south: -0.0455, east: 2.37266, north: 0.0455 };
/** The map before any camera is set: centred on 0,0 at zoom 0. */
const uninitialised: Bbox = {
  west: -8.437499917468585,
  south: -8.407168081955149,
  east: 8.437499917467193,
  north: 8.407168081956542,
};

describe('isSearchableZone', () => {
  it('takes the zone of a map on screen', () => {
    expect(isSearchableZone(paris)).toBe(true);
    expect(isSearchableZone(parisOnEquator)).toBe(true);
  });

  it('refuses a zone not known yet', () => {
    expect(isSearchableZone(null)).toBe(false);
    expect(isSearchableZone(undefined)).toBe(false);
  });

  it('refuses the zone of a map before any camera, centred on 0,0', () => {
    expect(isSearchableZone(uninitialised)).toBe(false);
  });

  it('refuses a zone without size', () => {
    expect(isSearchableZone({ west: 2.35, south: 48.85, east: 2.35, north: 48.85 })).toBe(false);
    expect(isSearchableZone({ ...paris, east: paris.west })).toBe(false);
    expect(isSearchableZone({ ...paris, north: paris.south })).toBe(false);
  });

  it('refuses corners in the wrong order', () => {
    expect(isSearchableZone({ ...paris, west: paris.east, east: paris.west })).toBe(false);
    expect(isSearchableZone({ ...paris, south: paris.north, north: paris.south })).toBe(false);
  });

  it('refuses corners out of the world or not numbers', () => {
    expect(isSearchableZone({ ...paris, north: 91 })).toBe(false);
    expect(isSearchableZone({ ...paris, west: -181 })).toBe(false);
    expect(isSearchableZone({ ...paris, south: Number.NaN })).toBe(false);
    expect(isSearchableZone({ ...paris, east: Number.POSITIVE_INFINITY })).toBe(false);
  });
});
