import { z } from 'zod';

/**
 * Key of the `settings` row of the anti-spam limit (wiki Compte-et-Monetisation › Freemium,
 * D-073): routes of one account awaiting moderation at once, at most. Creation itself is free and
 * without limit, for every plan.
 */
export const maxPendingRoutesKey = 'max_pending_routes';

/** Three routes awaiting moderation per account (D-073). */
export const defaultMaxPendingRoutes = 3;

const MaxPendingRoutes = z.int().positive();

/**
 * The limit from its `settings` value: a missing or invalid value (0 included, which would refuse
 * every submission) falls back to the default.
 */
export function maxPendingRoutesOf(value: unknown): number {
  const parsed = MaxPendingRoutes.safeParse(value);
  return parsed.success ? parsed.data : defaultMaxPendingRoutes;
}

/**
 * Whether an account may submit one more route, given its other routes awaiting moderation:
 * at the limit, `POST /routes/:id/submit` answers 429 `rate_limited` (D-073).
 */
export function canSubmitRoute(otherPendingRoutes: number, maxPendingRoutes: number): boolean {
  return otherPendingRoutes < maxPendingRoutes;
}
