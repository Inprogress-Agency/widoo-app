import type { Plan } from '@widoo/shared';
import type { User } from '../users/repository';

/**
 * What the right to a route reads of the caller: the plan of the account, and the Premium routes
 * it bought alone (`route_unlocks`) among those at stake, loaded by `routeViewerOf`.
 */
export type RouteViewer = Pick<User, 'plan' | 'planExpiresAt'> & {
  unlockedRouteIds: ReadonlySet<string>;
};

/**
 * Right of a caller to the whole of a route (wiki API › card de recherche, D-075; D-072, D-073):
 * every free route, for anyone; a Premium route, for an account whose plan is `premium` and has
 * not expired at `now` (subscription or 7-day pass, the same columns), or which bought this route
 * alone. A Premium plan without an end date (`plan_expires_at` null) does not expire; an anonymous
 * caller (`null`) has no right to a Premium route.
 *
 * The one place of the rule: the search reads it for each card, the planning before a new date
 * or a Go, and the route sheet will (#36).
 */
export function canAccessRoute(
  route: { id: string; access: Plan },
  viewer: RouteViewer | null,
  now: Date,
): boolean {
  if (route.access === 'free') {
    return true;
  }
  if (!viewer) {
    return false;
  }
  if (viewer.unlockedRouteIds.has(route.id)) {
    return true;
  }
  if (viewer.plan !== 'premium') {
    return false;
  }
  return viewer.planExpiresAt === null || viewer.planExpiresAt.getTime() > now.getTime();
}
