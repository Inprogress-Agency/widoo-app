/** Parcours › Créés (E-08): the caller's routes, every status. */
import { openRevisionStatuses, type MyRouteList, type MyRoutesQuery } from '@widoo/shared';
import { and, count, desc, eq, inArray, lt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { routeRevisions, routes, steps } from '../db/schema';

/** `GET /me/routes`: every route of the caller, every status, the newest first. */
export async function listOwnRoutes(
  db: Db,
  userId: string,
  { cursor, limit }: MyRoutesQuery,
): Promise<MyRouteList> {
  const page = await db
    .select()
    .from(routes)
    .where(and(eq(routes.authorId, userId), cursor ? lt(routes.id, cursor) : undefined))
    // UUID v7: the id orders by creation.
    .orderBy(desc(routes.id))
    .limit(limit + 1);
  const shown = page.slice(0, limit);
  const ids = shown.map((route) => route.id);
  const [stepCounts, revisions] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({ routeId: steps.routeId, count: count() })
            .from(steps)
            .where(inArray(steps.routeId, ids))
            .groupBy(steps.routeId),
          db
            .select({ routeId: routeRevisions.routeId, status: routeRevisions.status })
            .from(routeRevisions)
            .where(
              and(
                inArray(routeRevisions.routeId, ids),
                inArray(routeRevisions.status, [...openRevisionStatuses]),
              ),
            ),
        ]);
  const stepCountOf = new Map(stepCounts.map((row) => [row.routeId, row.count]));
  const revisionOf = new Map(revisions.map((row) => [row.routeId, row.status]));
  return {
    items: shown.map((route) => {
      const revisionStatus = revisionOf.get(route.id);
      return {
        id: route.id,
        status: route.status,
        isOfficial: route.isOfficial,
        title: route.title || null,
        shareToken: route.shareToken,
        publishedAt: route.publishedAt?.toISOString() ?? null,
        updatedAt: route.updatedAt.toISOString(),
        revision: revisionStatus ? { status: revisionStatus } : null,
        stepCount: stepCountOf.get(route.id) ?? 0,
      };
    }),
    nextCursor: page.length > limit ? (shown.at(-1)?.id ?? null) : null,
  };
}
