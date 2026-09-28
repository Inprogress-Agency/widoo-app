import { z } from 'zod';

export const componentNames = [
  'proximity',
  'quality',
  'reliability',
  'freshness',
  'context',
  'official',
] as const;
export type ComponentName = (typeof componentNames)[number];
export type Components = Record<ComponentName, number>;
export type RecommendationWeights = Components;

/** Key of the `settings` row holding the weights, whole or in part. */
export const weightsKey = 'recommendation.weights';

/** Weights of the wiki, used for any weight `settings` leaves out. */
export const defaultWeights: RecommendationWeights = {
  proximity: 0.3,
  quality: 0.25,
  reliability: 0.2,
  freshness: 0.1,
  context: 0.1,
  official: 0.05,
};

const Weight = z.number().min(0).max(10);
const StoredWeights = z.strictObject({
  proximity: Weight.optional(),
  quality: Weight.optional(),
  reliability: Weight.optional(),
  freshness: Weight.optional(),
  context: Weight.optional(),
  official: Weight.optional(),
}) satisfies z.ZodType<Partial<RecommendationWeights>>;

/**
 * Weights of the `settings` row over the defaults. A missing row, an unknown key, a weight
 * outside 0 to 10 or weights that are all zero fall back to the defaults as a whole.
 */
export function weightsOf(value: unknown): RecommendationWeights {
  const parsed = StoredWeights.safeParse(value);
  if (!parsed.success) return defaultWeights;
  const weights: RecommendationWeights = { ...defaultWeights, ...parsed.data };
  return componentNames.some((name) => weights[name] > 0) ? weights : defaultWeights;
}

/** Weighted sum of the components. */
export function scoreOf(components: Components, weights: RecommendationWeights): number {
  return componentNames.reduce((sum, name) => sum + weights[name] * components[name], 0);
}
