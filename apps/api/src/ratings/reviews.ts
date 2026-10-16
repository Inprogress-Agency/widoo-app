/**
 * The reviews of a route, as its sheet shows them (E-05 › « Voir les 128 avis », D-013): the
 * visible ratings, newest first, with the first name of their author and no reply.
 */
import { onlineRouteStatuses, type RouteRatingList, type RouteRatingsQuery } from '@widoo/shared';
import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client';
import { routeRatings, routes, users } from '../db/schema';
import { httpError } from '../errors';

/** Position of the last review of a page: base64url JSON, a position and no right. */
const Cursor = z.strictObject({ createdAt: z.iso.datetime(), id: z.uuid() });
type Cursor = z.infer<typeof Cursor>;

const encodeCursor = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url');

function decodeCursor(cursor: string): Cursor {
  try {
    return Cursor.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
  } catch {
    throw httpError(400, 'Invalid cursor');
  }
}

/**
 * The visible reviews of an online route, page by page; 404 for a route offline. A review is
 * published with the first name of its author: one without a first name, or of an account being
 * deleted, is not listed.
 */
export async function listRouteRatings(
  db: Db,
  routeId: string,
  query: RouteRatingsQuery,
): Promise<RouteRatingList> {
  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), inArray(routes.status, [...onlineRouteStatuses])));
  if (!route) {
    throw httpError(404, 'Route not found');
  }
  const after = query.cursor ? decodeCursor(query.cursor) : null;
  const afterDate = after ? new Date(after.createdAt) : null;
  const rows = await db
    .select({
      id: routeRatings.id,
      firstName: users.firstName,
      rating: routeRatings.rating,
      comment: routeRatings.comment,
      createdAt: routeRatings.createdAt,
    })
    .from(routeRatings)
    .innerJoin(users, eq(users.id, routeRatings.userId))
    .where(
      and(
        eq(routeRatings.routeId, routeId),
        eq(routeRatings.status, 'visible'),
        isNotNull(users.firstName),
        isNull(users.deletedAt),
        after && afterDate
          ? or(
              lt(routeRatings.createdAt, afterDate),
              and(eq(routeRatings.createdAt, afterDate), lt(routeRatings.id, after.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(routeRatings.createdAt), desc(routeRatings.id))
    .limit(query.limit + 1);
  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  return {
    items: page.flatMap(({ firstName, createdAt, ...review }) =>
      firstName ? [{ ...review, firstName, createdAt: createdAt.toISOString() }] : [],
    ),
    nextCursor:
      rows.length > query.limit && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null,
  };
}
