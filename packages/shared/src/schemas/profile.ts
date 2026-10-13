import { z } from 'zod';
import { plainText } from './common';

/**
 * Public profile of a creator (E-09, E-16, D-023): bio, neighborhood, anecdotes, featured routes
 * and the Créateur certifié badge. The database holds the same bounds (`users`,
 * `user_anecdotes`, `user_featured_routes`).
 */

/** Anecdotes and featured routes a profile shows, at most; their positions run from 1. */
export const profileSlots = 3;
export const ProfileSlot = z.int().min(1).max(profileSlots);

export const bioMaxLength = 150;
export const Bio = plainText(bioMaxLength);

/** « Paris 11e »: optional, shown next to the seniority. */
export const Neighborhood = plainText(60);

/** Technical key of an anecdote question: it never changes once stored, only its label does. */
export const AnecdoteQuestionKey = z.string().regex(/^[a-z0-9]+(_[a-z0-9]+)*$/);

/** An active anecdote question, in the order of the sheet (served by `/config`). */
export const AnecdoteQuestion = z.object({
  key: AnecdoteQuestionKey,
  label: z.string().min(1),
  position: z.int().positive(),
});
export type AnecdoteQuestion = z.infer<typeof AnecdoteQuestion>;

export const anecdoteAnswerMaxLength = 150;

export const Anecdote = z.object({
  questionKey: AnecdoteQuestionKey,
  answer: plainText(anecdoteAnswerMaxLength),
});
export type Anecdote = z.infer<typeof Anecdote>;

const isUnique = (values: readonly string[]) => new Set(values).size === values.length;

/** The anecdotes of a profile in display order: position `n` is index `n - 1`. */
export const Anecdotes = z
  .array(Anecdote)
  .max(profileSlots)
  .refine((anecdotes) => isUnique(anecdotes.map((a) => a.questionKey)), 'One answer per question');
export type Anecdotes = z.infer<typeof Anecdotes>;

/** Published routes of the user shown first on the profile, in display order. */
export const FeaturedRouteIds = z
  .array(z.uuid())
  .max(profileSlots)
  .refine(isUnique, 'A route is featured once');
export type FeaturedRouteIds = z.infer<typeof FeaturedRouteIds>;

/** Choice of the team in the admin, over the nightly computation of the badge. */
export const certifiedOverrides = ['none', 'granted', 'revoked'] as const;
export const CertifiedOverride = z.enum(certifiedOverrides);
export type CertifiedOverride = z.infer<typeof CertifiedOverride>;

/** Key of the `settings` row of each criterion of the badge; a value is a JSON number. */
export const certificationSettingKeys = {
  minVerifiedRoutes: 'certification.min_verified_routes',
  minRating: 'certification.min_rating',
  minCompletedRoutes: 'certification.min_completed_routes',
} as const;

const count = z.int().nonnegative();

/** Criteria of the badge, all required: verified routes, average rating, completed routes. */
export const CertificationThresholds = z.object({
  minVerifiedRoutes: count,
  minRating: z.number().min(0).max(5),
  minCompletedRoutes: count,
});
export type CertificationThresholds = z.infer<typeof CertificationThresholds>;

/** Wiki Compte-et-Monetisation (D-023): 3 verified routes, 4.5 or more, 3 completed routes. */
export const defaultCertificationThresholds: CertificationThresholds = {
  minVerifiedRoutes: 3,
  minRating: 4.5,
  minCompletedRoutes: 3,
};

const criteria = Object.keys(certificationSettingKeys) as (keyof CertificationThresholds)[];

/**
 * Thresholds from the `settings` values by key: each missing or invalid value falls back to its
 * default on its own, so a typo in one row never disables the badge.
 */
export function certificationThresholdsOf(
  values: Readonly<Record<string, unknown>>,
): CertificationThresholds {
  const entries = criteria.map((criterion) => {
    const parsed = CertificationThresholds.shape[criterion].safeParse(
      values[certificationSettingKeys[criterion]],
    );
    return [criterion, parsed.success ? parsed.data : defaultCertificationThresholds[criterion]];
  });
  return Object.fromEntries(entries) as CertificationThresholds;
}
