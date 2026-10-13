import type { AlreadyDecidedDetails, CatalogRouteAction } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import type { Db } from '../db/client';
import { moderationActionsTable, routes } from '../db/schema';
import { httpError } from '../errors';

type RouteActionInput = {
  routeId: string;
  /** The member of the team who acts. */
  actorId: string;
};

/**
 * Puts an unpublished route back online (A-04), with the reason kept in its history and in the
 * journal of the admin. A route that is not unpublished answers 409 `already_decided` with its
 * status: someone else acted first, or the route was never taken down.
 */
export async function republishRoute(
  db: Db,
  input: RouteActionInput & { message: string },
  now = new Date(),
): Promise<CatalogRouteAction> {
  return db.transaction(async (tx) => {
    const [route] = await tx
      .select({ status: routes.status, isOfficial: routes.isOfficial })
      .from(routes)
      .where(eq(routes.id, input.routeId))
      .for('update');
    if (!route) {
      throw httpError(404, 'Route not found');
    }
    if (route.status !== 'unpublished') {
      const details: AlreadyDecidedDetails = { status: route.status };
      throw httpError(409, 'Route is not unpublished', 'already_decided', details);
    }

    await tx
      .update(routes)
      .set({ status: 'published', publishedAt: now })
      .where(eq(routes.id, input.routeId));
    await tx.insert(moderationActionsTable).values({
      routeId: input.routeId,
      actorId: input.actorId,
      action: 'publish',
      message: input.message,
    });
    await recordAdminAction(tx, {
      actorId: input.actorId,
      action: 'route.republish',
      targetType: 'route',
      targetId: input.routeId,
      before: { status: route.status },
      after: { status: 'published' },
      reason: input.message,
    });
    return { routeId: input.routeId, status: 'published', isOfficial: route.isOfficial };
  });
}

/**
 * Hands a route over to the Widoo team (A-04): it becomes « Par Widoo » and loses its author,
 * so that the team can maintain it in the editor of the app. Its status does not change.
 * Reassigning a route of the team again changes nothing and writes nothing.
 */
export async function reassignRouteToTeam(
  db: Db,
  input: RouteActionInput,
): Promise<CatalogRouteAction> {
  return db.transaction(async (tx) => {
    const [route] = await tx
      .select({ status: routes.status, isOfficial: routes.isOfficial, authorId: routes.authorId })
      .from(routes)
      .where(eq(routes.id, input.routeId))
      .for('update');
    if (!route) {
      throw httpError(404, 'Route not found');
    }
    if (!route.isOfficial || route.authorId !== null) {
      await tx
        .update(routes)
        .set({ isOfficial: true, authorId: null })
        .where(eq(routes.id, input.routeId));
      await recordAdminAction(tx, {
        actorId: input.actorId,
        action: 'route.reassign',
        targetType: 'route',
        targetId: input.routeId,
        before: { isOfficial: route.isOfficial, authorId: route.authorId },
        after: { isOfficial: true, authorId: null },
      });
    }
    return { routeId: input.routeId, status: route.status, isOfficial: true };
  });
}
