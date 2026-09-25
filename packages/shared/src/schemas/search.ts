import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { Latitude, LatLng, Longitude } from './common';
import { RouteCard } from './route';

export const routeSorts = ['recommended', 'distance', 'duration', 'rating'] as const;

/** Filter groups of the search, in the order of the filter panel (E-03). */
export const routeFilterGroups = [
  'audiences',
  'moods',
  'conditions',
  'durations',
  'budgets',
  'transports',
] as const;
export type RouteFilterGroup = (typeof routeFilterGroups)[number];

/**
 * A repeated query parameter arrives as an array, a single one as a string. Duplicates are
 * dropped, so the list never holds more values than its taxonomy.
 */
function listOf<const T extends readonly [string, ...string[]]>(values: T) {
  const value = z.enum(values);
  return z
    .union([value, z.array(value)])
    .transform((v) => [...new Set(typeof v === 'string' ? [v] : v)])
    .optional();
}

const numbers = z
  .string()
  .transform((value) => value.split(',').map((part) => (part.trim() ? Number(part) : Number.NaN)));

const filters = {
  /** Public: at least one of the values (`&&`). */
  audiences: listOf(taxonomies.audiences),
  /** Ambiance: at least one of the values (`&&`). */
  moods: listOf(taxonomies.moods),
  /** Conditions: every value (`@>`), they are requirements. */
  conditions: listOf(taxonomies.conditions),
  durations: listOf(taxonomies.durations),
  budgets: listOf(taxonomies.budgets),
  transports: listOf(taxonomies.transports),
} satisfies Record<RouteFilterGroup, z.ZodType>;

const search = {
  bbox: numbers
    .pipe(z.tuple([Longitude, Latitude, Longitude, Latitude]))
    .transform(([west, south, east, north]) => ({ west, south, east, north }))
    .refine((b) => b.west < b.east && b.south < b.north, 'Expected west,south,east,north'),
  near: numbers
    .pipe(z.tuple([Latitude, Longitude]))
    .transform(([lat, lng]) => ({ lat, lng }))
    .optional(),
  ...filters,
  sort: z.enum(routeSorts).default('recommended'),
  /** Opaque, returned as `nextCursor`. */
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

const distanceNeedsNear = {
  check: (query: { sort: RouteSort; near?: LatLng }) =>
    query.sort !== 'distance' || query.near !== undefined,
  params: { path: ['near'], message: 'Required to sort by distance' },
};

/**
 * Query string of `GET /routes/search` (wiki API): `bbox=w,s,e,n`, `near=lat,lng`, filter keys.
 * Strict: an unknown key is refused rather than ignored, so a misspelled filter never answers
 * unfiltered results. The API reads `budgets[]=high` as `budgets=high` before this schema.
 */
export const RouteSearchQuery = z
  .strictObject(search)
  .refine(distanceNeedsNear.check, distanceNeedsNear.params);
export type RouteSearchQuery = z.infer<typeof RouteSearchQuery>;
/** What a client sends, before parsing. */
export type RouteSearchQueryInput = z.input<typeof RouteSearchQuery>;
export type RouteSort = (typeof routeSorts)[number];

/**
 * Query string of `GET /routes/search/count`: the same query, sort and page ignored.
 * `breakdown=all_but_one` adds the count without each active filter group (E-03 zero result).
 */
export const RouteCountQuery = z
  .strictObject({ ...search, breakdown: z.enum(['all_but_one']).optional() })
  .refine(distanceNeedsNear.check, distanceNeedsNear.params);
export type RouteCountQuery = z.infer<typeof RouteCountQuery>;
export type RouteCountQueryInput = z.input<typeof RouteCountQuery>;

/** Routes of a grid cell of a zone too large to list, placed at the mean of their starts. */
export const RouteCluster = z.object({
  center: LatLng,
  count: z.number().int().positive(),
});
export type RouteCluster = z.infer<typeof RouteCluster>;

/** Answer of `GET /routes/search`. */
export const RouteSearchResult = z.object({
  items: z.array(RouteCard),
  /** Null on the last page. */
  nextCursor: z.string().nullable(),
  /** Null when the zone is small enough to list its routes; `items` is empty otherwise. */
  clusters: z.array(RouteCluster).nullable(),
});
export type RouteSearchResult = z.infer<typeof RouteSearchResult>;

const count = z.number().int().nonnegative();

/** Answer of `GET /routes/search/count`. */
export const RouteCount = z.object({
  count,
  /** With `breakdown=all_but_one`: the count without each active group, one group at a time. */
  without: z.partialRecord(z.enum(routeFilterGroups), count).optional(),
});
export type RouteCount = z.infer<typeof RouteCount>;
