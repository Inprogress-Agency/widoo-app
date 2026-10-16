/**
 * The rating of a route in `routes.stats` (wiki Creation-et-Moderation › Notation des parcours),
 * recomputed from its visible ratings at each write.
 */
import { and, count, eq, sql } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { routeRatings, routes } from '../db/schema';

const isVisibleOf = (routeId: string) =>
  and(eq(routeRatings.routeId, routeId), eq(routeRatings.status, 'visible'));

/**
 * Writes the average (two decimals, null without a rating) and the count of the visible ratings
 * of `routeId` into `routes.stats`, the route locked so that two ratings at once count both. The
 * other counters of `stats` are kept, and `updated_at` is untouched: a rating is not an edit.
 */
export async function recomputeRouteRating(
  tx: Tx,
  routeId: string,
): Promise<{ average: number | null; count: number }> {
  const [route] = await tx
    .select({ status: routes.status })
    .from(routes)
    .where(eq(routes.id, routeId))
    .for('no key update');
  if (!route) return { average: null, count: 0 };
  const [totals] = await tx
    .select({
      average: sql<number | null>`round(avg(${routeRatings.rating}), 2)::float8`,
      count: count(),
    })
    .from(routeRatings)
    .where(isVisibleOf(routeId));
  const average = totals?.average ?? null;
  const total = totals?.count ?? 0;
  await tx.execute(sql`
    update ${routes}
    set stats = ${routes.stats} || jsonb_build_object('rating_avg', ${average}::float8, 'rating_count', ${total}::int)
    where ${routes.id} = ${routeId}`);
  return { average, count: total };
}
