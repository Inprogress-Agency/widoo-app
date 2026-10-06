import { z } from 'zod';
import { Latitude, LatLng, Longitude } from './common';

/**
 * What the search of E-02 types, as `GET /geocode?q=` and `GET /routes/search?q=` take it:
 * trimmed, 2 to 100 characters, plain text. Mapbox takes 256 characters at most.
 */
export const SearchText = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[^<>\p{Cc}]*$/u, 'Plain text only, without < > or control characters');

/** Query string of `GET /geocode`. Strict, as every query of the API. */
export const GeocodeQuery = z.strictObject({ q: SearchText });
export type GeocodeQuery = z.infer<typeof GeocodeQuery>;

/**
 * Kinds of zone the search proposes (Filtres-et-Recherche › Recherche textuelle, D-010): a
 * neighbourhood, a district (arrondissement), a postcode, a city, a station. Never an address nor
 * a point of interest: Widoo looks for routes in a zone.
 */
export const geocodeZoneKinds = [
  'neighborhood',
  'district',
  'postcode',
  'city',
  'station',
] as const;
export type GeocodeZoneKind = (typeof geocodeZoneKinds)[number];

/** Envelope in degrees, in the order of `bbox=west,south,east,north`. */
export const GeoBox = z
  .object({ west: Longitude, south: Latitude, east: Longitude, north: Latitude })
  .refine((b) => b.west < b.east && b.south < b.north, 'Expected west < east and south < north');
export type GeoBox = z.infer<typeof GeoBox>;

/** A zone proposed for the search, with the number of routes it holds. */
export const GeocodeZone = z.object({
  /** Stable id of the provider: the recent searches tell zones apart by it. */
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(200),
  kind: z.enum(geocodeZoneKinds),
  /** Where the zone lies, short: « Paris 10e », « Lyon »; null when nothing more is known. */
  area: z.string().min(1).max(200).nullable(),
  center: LatLng,
  /**
   * The zone the app frames and searches, which the count is made on: the envelope of the zone,
   * widened to `zoneMinSpanM` around its centre when it is smaller (`zoneSearchBox`).
   */
  bbox: GeoBox,
  /** Published routes whose envelope meets `bbox`, filters left out. */
  routeCount: z.number().int().nonnegative(),
});
export type GeocodeZone = z.infer<typeof GeocodeZone>;

/** Answer of `GET /geocode`: the zones, the most relevant first. */
export const GeocodeResult = z.object({ zones: z.array(GeocodeZone) });
export type GeocodeResult = z.infer<typeof GeocodeResult>;
