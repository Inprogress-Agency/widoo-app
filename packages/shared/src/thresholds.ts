import { z } from 'zod';

const bound = z.number().nonnegative();

/**
 * Inclusive upper bound of each bucket; the last bucket (`premium`, `weekend`) has none.
 * The API overrides the defaults from `settings` and serves the result on `/config`.
 */
export const BucketThresholds = z.object({
  /** Budget per person, in euros. */
  budgetEur: z
    .object({ free: bound, low: bound, medium: bound })
    .refine(({ free, low, medium }) => free < low && low < medium, 'Bounds must increase'),
  /** Total duration, in minutes. */
  durationMin: z
    .object({ '1_2h': bound, half_day: bound, full_day: bound })
    .refine((d) => d['1_2h'] < d.half_day && d.half_day < d.full_day, 'Bounds must increase'),
});
export type BucketThresholds = z.infer<typeof BucketThresholds>;

/** Wiki Filtres-et-Recherche: free = 0 €, low ≤ 25 €, medium ≤ 70 €; 1_2h ≤ 2 h 30, half_day ≤ 5 h, full_day ≤ 12 h. */
export const defaultBucketThresholds: BucketThresholds = {
  budgetEur: { free: 0, low: 25, medium: 70 },
  durationMin: { '1_2h': 150, half_day: 300, full_day: 720 },
};
