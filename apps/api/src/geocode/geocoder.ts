import type { AppLocale, GeoBox, GeocodeZoneKind, LatLng } from '@widoo/shared';

/** A zone found for a text, named in the language asked, before its routes are counted. */
export interface ZoneHit {
  id: string;
  name: string;
  kind: GeocodeZoneKind;
  area: string | null;
  center: LatLng;
  /** Envelope given by the provider; null for a point, such as a station. */
  envelope: GeoBox | null;
}

/**
 * Finds the zones of a text, named in `locale`, the language of the app; throws
 * `GeocoderUnavailable` when no source answered.
 */
export interface Geocoder {
  find: (text: string, locale: AppLocale) => Promise<ZoneHit[]>;
}

/** No source of zones answered: the search shows « Zones indisponibles pour le moment ». */
export class GeocoderUnavailable extends Error {
  constructor() {
    super('Geocoding unavailable');
    this.name = 'GeocoderUnavailable';
  }
}

/**
 * Key of a text, so that « Montmartre », « montmartre » and «  Montmartre » are one search:
 * Unicode normalized, lower case, single spaces.
 */
export const textKey = (text: string) =>
  text.normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim();

/**
 * Most zones proposed: the search shows « Zones » before « Parcours », and each zone costs a
 * count (Ecrans › E-02).
 */
export const MAX_ZONES = 8;
