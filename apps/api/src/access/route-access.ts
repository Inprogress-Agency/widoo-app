import type { Plan } from '@widoo/shared';
import type { User } from '../users/repository';

/** What the right to a route reads of the caller's account. */
export type RouteViewer = Pick<User, 'plan' | 'planExpiresAt'>;

/**
 * Right of a caller to the whole of a route (wiki API › card de recherche, D-075): every free
 * route, for anyone; a Premium route, for an account whose plan is `premium` and has not expired
 * at `now`. A Premium plan without an end date (`plan_expires_at` null) does not expire; an
 * anonymous caller (`null`) has no right to a Premium route.
 *
 * The one place of the rule: the search reads it for each card, the route sheet will (#36), and
 * the 7-day pass and the unlock of a single route extend it here (#66).
 */
export function canAccessRoute(
  route: { access: Plan },
  viewer: RouteViewer | null,
  now: Date,
): boolean {
  if (route.access === 'free') {
    return true;
  }
  if (viewer?.plan !== 'premium') {
    return false;
  }
  return viewer.planExpiresAt === null || viewer.planExpiresAt.getTime() > now.getTime();
}
