/**
 * The rating of a route in `routes.stats` (wiki Creation-et-Moderation › Notation des parcours),
 * recomputed from its visible ratings at each write, and the `low_rating` report it may open
 * (D-086, D-087).
 */
import { isLowRating, lowRatingThreshold, systemRouteReportReason } from '@widoo/shared';
import { and, count, desc, eq, gt, sql } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { routeRatings, routeReports, routes } from '../db/schema';

const isVisibleOf = (routeId: string) =>
  and(eq(routeRatings.routeId, routeId), eq(routeRatings.status, 'visible'));

/**
 * Opens the `low_rating` report of a published route that falls under 2.5 with 5 ratings: one
 * open at a time, and after a decision, only once 5 new ratings came since (D-087).
 */
async function reportLowRating(tx: Tx, routeId: string, now: Date): Promise<void> {
  const [last] = await tx
    .select({ status: routeReports.status, reviewedAt: routeReports.reviewedAt })
    .from(routeReports)
    .where(and(eq(routeReports.routeId, routeId), eq(routeReports.reason, systemRouteReportReason)))
    .orderBy(desc(routeReports.createdAt))
    .limit(1);
  if (last?.status === 'open') return;
  if (last?.reviewedAt) {
    const [since] = await tx
      .select({ value: count() })
      .from(routeRatings)
      .where(and(isVisibleOf(routeId), gt(routeRatings.createdAt, last.reviewedAt)));
    if ((since?.value ?? 0) < lowRatingThreshold.newRatingsToReopen) return;
  }
  // The partial unique index keeps one open report, should another write open it meanwhile.
  await tx
    .insert(routeReports)
    .values({ routeId, userId: null, reason: systemRouteReportReason, createdAt: now })
    .onConflictDoNothing();
}

/**
 * Writes the average (two decimals, null without a rating) and the count of the visible ratings
 * of `routeId` into `routes.stats`, the route locked so that two ratings at once count both. The
 * other counters of `stats` are kept, and `updated_at` is untouched: a rating is not an edit.
 */
export async function recomputeRouteRating(
  tx: Tx,
  routeId: string,
  now: Date = new Date(),
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
  if (route.status === 'published' && isLowRating(average, total)) {
    await reportLowRating(tx, routeId, now);
  }
  return { average, count: total };
}
