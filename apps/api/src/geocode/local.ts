import { MAX_ZONES, textKey, type Geocoder, type ZoneHit } from './geocoder';

/**
 * A few zones of Paris, for a local API without Mapbox token: the search of the app can be tried
 * without calling Mapbox. Never in production, where a missing token answers no zone.
 */
const localZones: ZoneHit[] = [
  {
    id: 'local:montmartre',
    name: 'Montmartre',
    kind: 'neighborhood',
    area: 'Paris 18e',
    center: { lat: 48.8867, lng: 2.3431 },
    envelope: { west: 2.3305, south: 48.8805, east: 2.3485, north: 48.8925 },
  },
  {
    id: 'local:canal-saint-martin',
    name: 'Canal Saint-Martin',
    kind: 'neighborhood',
    area: 'Paris 10e',
    center: { lat: 48.8709, lng: 2.3654 },
    envelope: { west: 2.3602, south: 48.8661, east: 2.3713, north: 48.8838 },
  },
  {
    id: 'local:le-marais',
    name: 'Le Marais',
    kind: 'neighborhood',
    area: 'Paris 3e',
    center: { lat: 48.8592, lng: 2.3622 },
    envelope: { west: 2.3504, south: 48.8521, east: 2.3699, north: 48.8665 },
  },
  {
    id: 'local:belleville',
    name: 'Belleville',
    kind: 'neighborhood',
    area: 'Paris 20e',
    center: { lat: 48.8722, lng: 2.3767 },
    envelope: { west: 2.3699, south: 48.8676, east: 2.3929, north: 48.8778 },
  },
  {
    id: 'local:paris-11',
    name: 'Paris 11e',
    kind: 'district',
    area: 'Paris',
    center: { lat: 48.8592, lng: 2.3796 },
    envelope: { west: 2.3637, south: 48.8487, east: 2.3984, north: 48.8713 },
  },
  {
    id: 'local:75011',
    name: '75011',
    kind: 'postcode',
    area: 'Paris',
    center: { lat: 48.8592, lng: 2.3796 },
    envelope: { west: 2.3637, south: 48.8487, east: 2.3984, north: 48.8713 },
  },
  {
    id: 'local:republique',
    name: 'République',
    kind: 'station',
    area: 'Paris 10e',
    center: { lat: 48.8675, lng: 2.3637 },
    envelope: null,
  },
  {
    id: 'local:bastille',
    name: 'Bastille',
    kind: 'station',
    area: 'Paris 11e',
    center: { lat: 48.8531, lng: 2.3691 },
    envelope: null,
  },
  {
    id: 'local:paris',
    name: 'Paris',
    kind: 'city',
    area: 'Île-de-France',
    center: { lat: 48.8566, lng: 2.3522 },
    envelope: { west: 2.2241, south: 48.8156, east: 2.4699, north: 48.9022 },
  },
];

/** Accents aside, as Mapbox matches them. */
const looseKey = (text: string) => textKey(text).normalize('NFD').replace(/\p{M}/gu, '');

/** The local zones whose name starts a word with the text. */
export const localGeocoder: Geocoder = {
  find: async (text) => {
    const key = looseKey(text);
    const matches = (zone: ZoneHit) =>
      looseKey(zone.name)
        .split(/[\s-]+/)
        .some((word) => word.startsWith(key)) || looseKey(zone.name).startsWith(key);
    return localZones.filter(matches).slice(0, MAX_ZONES);
  },
};
