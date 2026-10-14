import { z } from 'zod';
import { taxonomies, type Taxonomy } from '../taxonomies';
import { BucketThresholds } from '../thresholds';
import { LegalVersions } from './legal';
import { AnecdoteQuestion, CertificationThresholds } from './profile';

/** App build version, `major.minor.patch`. */
export const AppVersion = z.string().regex(/^\d+\.\d+\.\d+$/, 'Expected major.minor.patch');

/**
 * Versions of the builds of one platform (E-20, D-063): under `minVersion`, the app blocks;
 * under `recommendedVersion`, never older than `minVersion`, it offers the update.
 */
export const PlatformVersions = z.object({
  minVersion: AppVersion,
  recommendedVersion: AppVersion,
});
export type PlatformVersions = z.infer<typeof PlatformVersions>;

/** One entry per platform of `appPlatforms`. */
export const AppVersions = z.object({ ios: PlatformVersions, android: PlatformVersions });
export type AppVersions = z.infer<typeof AppVersions>;

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
  /**
   * Oldest app build the API still serves, every platform alike. Kept for the builds that read
   * it; `appVersions` replaces it.
   */
  minAppVersion: AppVersion,
  /** Minimum and recommended build of each platform (E-20, D-063). */
  appVersions: AppVersions,
  /** Versions in force of the legal texts (`GET /legal/:doc`). */
  legal: LegalVersions,
  /** Technical values of each taxonomy, in display order. */
  taxonomies: byTaxonomy(z.array(z.string()).readonly()),
  /** Display labels by locale, then taxonomy, then value. */
  labels: z.object({ fr: byTaxonomy(z.record(z.string(), z.string())) }),
  /** Bucket bounds used to classify budgets and durations. */
  thresholds: BucketThresholds,
  /** Active anecdote questions, in the order of the sheet (E-09). */
  anecdoteQuestions: z.array(AnecdoteQuestion),
  /** Public thresholds of the Créateur certifié badge (D-023). */
  certificationThresholds: CertificationThresholds,
});
export type AppConfig = z.infer<typeof AppConfig>;
