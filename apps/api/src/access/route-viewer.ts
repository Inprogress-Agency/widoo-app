import type { Plan } from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { routes as routesTable, routeUnlocks } from '../db/schema';
import type { User } from '../users/repository';
import type { RouteViewer } from './route-access';

/**
 * The caller as `canAccessRoute` reads it for these routes, anonymous when null. Only the unlocks
 * and the authorship of the Premium routes among them are read: nothing when every route is free.
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
  const [unlocked, authored] =
    premiumIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({ routeId: routeUnlocks.routeId })
            .from(routeUnlocks)
            .where(
              and(eq(routeUnlocks.userId, user.id), inArray(routeUnlocks.routeId, premiumIds)),
            ),
          db
            .select({ routeId: routesTable.id })
            .from(routesTable)
            .where(and(eq(routesTable.authorId, user.id), inArray(routesTable.id, premiumIds))),
        ]);
  return {
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    unlockedRouteIds: new Set(unlocked.map((row) => row.routeId)),
    authoredRouteIds: new Set(authored.map((row) => row.routeId)),
  };
}
