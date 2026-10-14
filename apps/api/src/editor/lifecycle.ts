/**
 * The one writer of `routes.status`: every move goes through `moveRoute`, checked against the
 * life cycle of `@widoo/shared`, with what the move implies written in the same transaction.
 */
import {
  canMoveRoute,
  publicRouteStatuses,
  type RouteActor,
  type RouteStatus,
} from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { Tx } from '../db/client';
import { routes, userFeaturedRoutes } from '../db/schema';
import { conflict } from '../errors';

/** A route as its row is read. */
export type RouteRow = typeof routes.$inferSelect;

/** Token of the private link: 192 random bits, URL-safe (`GET /routes/:id?token=`). */
export const newShareToken = () => randomBytes(24).toString('base64url');

/**
 * Moves a route, locked by the caller, from its status to `to`, or answers 409 `conflict` for a
 * move the life cycle refuses to `actor`. In the same transaction: the private link is created on
 * the first move to `private`; the first publication is dated; a route that leaves the public
 * statuses leaves the profiles that featured it (D-023), there being no trigger in the database.
 */
export async function moveRoute(
  tx: Tx,
  route: RouteRow,
  to: RouteStatus,
  actor: RouteActor,
  now: Date,
): Promise<RouteRow> {
  if (!canMoveRoute(route.status, to, actor)) {
    throw conflict(`A ${route.status} route cannot become ${to}`, { status: route.status });
  }
  const [moved] = await tx
    .update(routes)
    .set({
      status: to,
      ...(to === 'private' && !route.shareToken && { shareToken: newShareToken() }),
      ...(to === 'published' && !route.publishedAt && { publishedAt: now }),
    })
    .where(eq(routes.id, route.id))
    .returning();
  if (!moved) throw new Error(`Route ${route.id} vanished while locked`);
  if (publicRouteStatuses.includes(route.status) && !publicRouteStatuses.includes(to)) {
    await tx.delete(userFeaturedRoutes).where(eq(userFeaturedRoutes.routeId, route.id));
  }
  return moved;
}
