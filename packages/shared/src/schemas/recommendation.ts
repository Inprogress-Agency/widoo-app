import { z } from 'zod';

/**
 * Keys of the main reason of a recommended card (wiki Filtres-et-Recherche › Recommandation
 * « autour de moi »): the app shows it discreetly, « À 600 m », « Très bien noté », « Vérifié
 * récemment ». Technical keys only: the labels belong to the app.
 */
export const recommendationReasons = [
  'near_you',
  'top_rated',
  'verified',
  'fresh',
  'good_timing',
  'official',
] as const;
export type RecommendationReasonKey = (typeof recommendationReasons)[number];

/** `near_you` carries the distance from the position to the start, for « À 600 m ». */
export const RecommendationReason = z.discriminatedUnion('key', [
  z.object({ key: z.literal('near_you'), distanceM: z.number().int().nonnegative() }),
  z.object({ key: z.enum(recommendationReasons).exclude(['near_you']) }),
]);
export type RecommendationReason = z.infer<typeof RecommendationReason>;
