import { z } from 'zod';

/** Rows an import may hold at once. */
export const placeImportMaxRows = 500;

/**
 * Body of `POST /admin/places/import` (A-04). Each row is a place as `CatalogPlaceInput`
 * describes it, sent unchecked with the line of the file it comes from: the API checks every row
 * and answers row by row. With `dryRun`, nothing is created: this is the preview.
 */
export const PlaceImportBody = z.strictObject({
  dryRun: z.boolean(),
  rows: z
    .array(z.strictObject({ line: z.number().int().positive(), place: z.unknown() }))
    .min(1)
    .max(placeImportMaxRows),
});
export type PlaceImportBody = z.infer<typeof PlaceImportBody>;

/**
 * What became of a row: `ready` to be created (preview), `created`, `invalid` (fields refused),
 * `duplicate` (a place of the same name within 50 m, in the catalog or earlier in the file), or
 * `outside` every city.
 */
export const placeImportOutcomes = ['ready', 'created', 'invalid', 'duplicate', 'outside'] as const;
export type PlaceImportOutcome = (typeof placeImportOutcomes)[number];

export const PlaceImportRowResult = z.object({
  line: z.number().int().positive(),
  outcome: z.enum(placeImportOutcomes),
  /** For `invalid`: the fields of the place that are missing or refused. */
  fields: z.array(z.string()),
  /** For `duplicate`: the place it doubles, with the line of the file when it is another row. */
  duplicateOf: z
    .object({ name: z.string(), placeId: z.uuid().nullable(), line: z.number().int().nullable() })
    .nullable(),
});
export type PlaceImportRowResult = z.infer<typeof PlaceImportRowResult>;

/** Answer of an import, or of its preview: every row, in the order of the file. */
export const PlaceImportResult = z.object({
  rows: z.array(PlaceImportRowResult),
  counts: z.record(z.enum(placeImportOutcomes), z.number().int().nonnegative()),
});
export type PlaceImportResult = z.infer<typeof PlaceImportResult>;
