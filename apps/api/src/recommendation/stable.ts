/**
 * Stable components of the score, recomputed nightly into `routes.recommendation` (wiki
 * Modele-de-Donnees): quality, reliability, freshness, official, and when the route suits in the
 * day, which the context reads at request time.
 */
import type { PlaceCategory, VerificationStatus } from '@widoo/shared';
import { z } from 'zod';
import {
  dayParts,
  defaultPriorMean,
  freshnessOf,
  momentsOf,
  neutral,
  officialOf,
  qualityOf,
  reliabilityOf,
} from './components';

const unit = z.number().min(0).max(1);

/** `routes.recommendation`, snake_case like the other computed jsonb columns. */
export const StoredRecommendation = z.object({
  quality: unit,
  /** At least one rating: « Très bien noté » needs one. */
  rated: z.boolean(),
  reliability: unit,
  freshness: unit,
  official: unit,
  moments: z.array(z.enum(dayParts)),
  computed_at: z.iso.datetime(),
});
export type StoredRecommendation = z.infer<typeof StoredRecommendation>;
export type StableComponents = Omit<StoredRecommendation, 'computed_at'>;

/** What the stable components are computed from. */
export type StableInput = {
  isOfficial: boolean;
  rating: { average: number | null; count: number };
  publishedAt: Date | null;
  /** `computed.computed_at` of the orchestration. */
  computedAt: Date | null;
  /** Verification status of each place, in step order. */
  placeStatuses: readonly VerificationStatus[];
  firstCategory: PlaceCategory | null;
};

export function stableRecommendationOf(
  input: StableInput,
  context: { now: Date; priorMean?: number },
): StoredRecommendation {
  return {
    quality: qualityOf(input.rating, context.priorMean ?? defaultPriorMean),
    rated: input.rating.average !== null && input.rating.count > 0,
    reliability: reliabilityOf(input.placeStatuses),
    freshness: freshnessOf([input.publishedAt, input.computedAt], context.now),
    official: officialOf(input.isOfficial),
    moments: momentsOf(input.firstCategory),
    computed_at: context.now.toISOString(),
  };
}

/**
 * Stable components of a search row: the stored ones, or, for a route the job has not reached
 * yet (published since the last run), those the row itself tells: quality without the global
 * prior, freshness, official; a neutral reliability and no moment.
 */
export function stableComponentsOf(
  stored: unknown,
  row: Pick<StableInput, 'isOfficial' | 'rating' | 'publishedAt'>,
  now: Date,
): StableComponents {
  const parsed = StoredRecommendation.safeParse(stored);
  if (parsed.success) return parsed.data;
  return {
    quality: qualityOf(row.rating),
    rated: row.rating.average !== null && row.rating.count > 0,
    reliability: neutral,
    freshness: freshnessOf([row.publishedAt], now),
    official: officialOf(row.isOfficial),
    moments: [],
  };
}
