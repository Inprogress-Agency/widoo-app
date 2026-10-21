import {
  onlineRouteStatuses,
  type RouteReportBody,
  type RouteReportReceipt,
  type UserRouteReportReason,
} from '@widoo/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { routes } from '../db/schema';
import { httpError } from '../errors';
import type { User } from '../users/repository';
import { createRouteReport } from './repository';

/**
 * Writes the report a reader makes of an online route (wiki API › Lieux, D-056). 404 for a route
 * that does not exist or is not online (a draft, a rejected or a withdrawn one: the answer never
 * tells them apart), 403 for the route of the caller. The rule of the 7 days, the check of the
 * step and the lock against two reports at once are those of `createRouteReport`: 409 with
 * `details.reportedAt`, and 422 for a step that is not of the route.
 */
export async function submitRouteReport(
  db: Db,
  user: User,
  routeId: string,
  body: RouteReportBody,
  now: Date = new Date(),
): Promise<RouteReportReceipt> {
  const [route] = await db
    .select({ status: routes.status, authorId: routes.authorId })
    .from(routes)
    .where(eq(routes.id, routeId));
  if (!route || !(onlineRouteStatuses as readonly string[]).includes(route.status)) {
    throw httpError(404, 'Route not found');
  }
  if (route.authorId === user.id) {
    throw httpError(403, 'A route cannot be reported by its author');
  }
  const created = await db.transaction((tx) =>
    createRouteReport(
      tx,
      {
        routeId,
        userId: user.id,
        reason: body.reason satisfies UserRouteReportReason,
        stepId: body.stepId,
        comment: body.comment,
      },
      now,
    ),
  );
  return {
    id: created.id,
    reason: body.reason,
    status: 'open',
    reportedAt: created.createdAt.toISOString(),
  };
}
