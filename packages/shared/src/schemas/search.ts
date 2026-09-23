import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { Latitude, Longitude } from './common';

export const routeSorts = ['recommended', 'distance', 'duration', 'rating'] as const;

/** A repeated query parameter arrives as an array, a single one as a string. */
function listOf<const T extends readonly [string, ...string[]]>(values: T) {
  const value = z.enum(values);
  return z
    .union([value, z.array(value)])
    .transform((v) => (typeof v === 'string' ? [v] : v))
    .optional();
}

const numbers = z
  .string()
  .transform((value) => value.split(',').map((part) => (part.trim() ? Number(part) : Number.NaN)));

/** Query string of `GET /routes/search` (wiki API): `bbox=w,s,e,n`, `near=lat,lng`, filter keys. */
export const RouteSearchQuery = z
  .object({
    bbox: numbers
      .pipe(z.tuple([Longitude, Latitude, Longitude, Latitude]))
      .transform(([west, south, east, north]) => ({ west, south, east, north }))
      .refine((b) => b.west < b.east && b.south < b.north, 'Expected west,south,east,north'),
    near: numbers
      .pipe(z.tuple([Latitude, Longitude]))
      .transform(([lat, lng]) => ({ lat, lng }))
      .optional(),
    audiences: listOf(taxonomies.audiences),
    moods: listOf(taxonomies.moods),
    conditions: listOf(taxonomies.conditions),
    durations: listOf(taxonomies.durations),
    budgets: listOf(taxonomies.budgets),
    transports: listOf(taxonomies.transports),
    sort: z.enum(routeSorts).default('recommended'),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((query) => query.sort !== 'distance' || query.near !== undefined, {
    path: ['near'],
    message: 'Required to sort by distance',
  });
export type RouteSearchQuery = z.infer<typeof RouteSearchQuery>;
/** What a client sends, before parsing. */
export type RouteSearchQueryInput = z.input<typeof RouteSearchQuery>;
export type RouteSort = (typeof routeSorts)[number];
