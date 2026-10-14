import type { Plan } from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { routeUnlocks } from '../db/schema';
import type { User } from '../users/repository';
import type { RouteViewer } from './route-access';

/**
 * The caller as `canAccessRoute` reads it for these routes, anonymous when null. Only the unlocks
 * of the Premium routes among them are read: none at all when every route is free.
 */
export async function routeViewerOf(
  db: Db | Tx,
  user: User | null,
  routes: readonly { id: string; access: Plan }[],
): Promise<RouteViewer | null> {
  if (!user) {
    return null;
  }
  const premiumIds = routes.filter((route) => route.access === 'premium').map((route) => route.id);
  const unlocked =
    premiumIds.length === 0
      ? []
      : await db
          .select({ routeId: routeUnlocks.routeId })
          .from(routeUnlocks)
          .where(and(eq(routeUnlocks.userId, user.id), inArray(routeUnlocks.routeId, premiumIds)));
  return {
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    unlockedRouteIds: new Set(unlocked.map((row) => row.routeId)),
  };
}
