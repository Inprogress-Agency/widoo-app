import { z } from 'zod';
import { taxonomies, type Taxonomy } from '../taxonomies';
import { BucketThresholds } from '../thresholds';

/** App build version, `major.minor.patch`. */
export const AppVersion = z.string().regex(/^\d+\.\d+\.\d+$/, 'Expected major.minor.patch');

/**
 * One entry per taxonomy. `z.object` drops a taxonomy the API adds later instead of failing,
 * so a build already in the stores keeps reading `/config`.
 */
function byTaxonomy<T extends z.ZodType>(schema: T) {
  const shape = Object.fromEntries(Object.keys(taxonomies).map((key) => [key, schema]));
  return z.object(shape as Record<Taxonomy, T>);
}

/** Body of `GET /config`, loaded by the app and the admin at startup. */
export const AppConfig = z.object({
  /** Oldest app build the API still serves: an older build asks for an update. */
  minAppVersion: AppVersion,
  /** Technical values of each taxonomy, in display order. */
  taxonomies: byTaxonomy(z.array(z.string()).readonly()),
  /** Display labels by locale, then taxonomy, then value. */
  labels: z.object({ fr: byTaxonomy(z.record(z.string(), z.string())) }),
  /** Bucket bounds used to classify budgets and durations. */
  thresholds: BucketThresholds,
});
export type AppConfig = z.infer<typeof AppConfig>;
