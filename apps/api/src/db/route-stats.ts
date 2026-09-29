import { z } from 'zod';

/** `routes.stats`, denormalized and recomputed: a missing or invalid rating reads as none. */
export const RouteStats = z.object({
  rating_avg: z.number().min(1).max(5).nullable().catch(null).default(null),
  rating_count: z.number().int().nonnegative().catch(0).default(0),
});

/** Rating of a `routes.stats` value. */
export function ratingOf(stats: unknown): { average: number | null; count: number } {
  const parsed = RouteStats.parse(stats ?? {});
  return { average: parsed.rating_avg, count: parsed.rating_count };
}
