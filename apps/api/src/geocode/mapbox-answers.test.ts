import { describe, expect, it } from 'vitest';
import { stationsOfSearchBox, zonesOfGeocoding } from './mapbox-answers';
import { address, cafe, district, neighborhood, station } from './mapbox.fixtures';

describe('zonesOfGeocoding', () => {
  it('reads neighbourhoods and districts, and drops an address', () => {
    expect(zonesOfGeocoding({ features: [neighborhood, district, address] })).toEqual([
      {
        id: 'geo-montmartre',
        name: 'Montmartre',
        kind: 'neighborhood',
        area: 'Paris 18e',
        center: { lat: 48.8867, lng: 2.3431 },
        envelope: { west: 2.3305, south: 48.8805, east: 2.3485, north: 48.8925 },
      },
      {
        id: 'geo-paris-11',
        name: 'Paris 11e',
        kind: 'district',
        area: 'Paris',
        center: { lat: 48.8592, lng: 2.3796 },
        envelope: { west: 2.3637, south: 48.8487, east: 2.3984, north: 48.8713 },
      },
    ]);
  });
});

describe('stationsOfSearchBox', () => {
  it('keeps the stations only: a café is a point of interest, not a zone', () => {
    expect(stationsOfSearchBox({ features: [station, cafe] })).toEqual([
      {
        id: 'poi-republique',
        name: 'République',
        kind: 'station',
        area: 'Paris 10e',
        center: { lat: 48.8675, lng: 2.3637 },
        envelope: null,
      },
    ]);
  });
});
