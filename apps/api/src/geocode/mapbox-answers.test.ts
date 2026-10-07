import { describe, expect, it } from 'vitest';
import { namesText, stationsOfSearchBox, zonesOfGeocoding } from './mapbox-answers';
import { address, busStop, cafe, district, neighborhood, station } from './mapbox.fixtures';

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
  it('keeps the rail stations only: a café or a bus stop is not a zone', () => {
    expect(stationsOfSearchBox({ features: [station, cafe, busStop] })).toEqual([
      {
        id: 'poi-republique',
        name: 'République',
        kind: 'station',
        // No locality on a station: its arrondissement comes from its postcode.
        area: 'Paris 3e',
        center: { lat: 48.8675, lng: 2.3637 },
        envelope: null,
      },
    ]);
  });
});

describe('namesText', () => {
  it.each([
    ['Montmartre', 'montm'],
    ['Canal St. Martin', 'Canal Saint-Martin'],
    ['République', 'republique'],
    ['75011', '75011'],
  ])('« %s » is named by « %s »', (name, text) => {
    expect(namesText(name, text)).toBe(true);
  });

  it.each([
    ['Le Tivoli', '12 rue de Rivoli'],
    ['Eiffel', 'Tour Eiffel'],
  ])('« %s » is not named by « %s »', (name, text) => {
    expect(namesText(name, text)).toBe(false);
  });
});
