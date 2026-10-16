/**
 * Ratings of routes (wiki API › Favoris et programmation, Creation-et-Moderation › Notation des
 * parcours): only an outing of the caller, completed with half of its steps done, gives the right
 * to rate, and only its own route; another user's outing is « not found », like the planning.
 */
import { canRateOuting, type RateRoute, type RateRouteResult } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { plannedSteps, routeRatings } from '../db/schema';
import { httpError } from '../errors';
import { ownedPlanned } from '../planned/repository';
import { toMyRating } from './mine';
import { recomputeRouteRating } from './stats';

/**
 * Rates the route of the caller's outing `plannedId`: creates the rating, or updates the one of
 * an earlier outing (one per user and per route), then recomputes the route. 409 while the outing
 * is not completed with half of its steps done, or once its route is deleted. The answer carries
 * the rating of the route recomputed with it.
 */
export async function rateOuting(
  db: Db,
  userId: string,
  plannedId: string,
  body: RateRoute,
  now: Date = new Date(),
): Promise<RateRouteResult> {
  return db.transaction(async (tx) => {
    const outing = await ownedPlanned(tx, userId, plannedId, true);
    const steps = await tx
      .select({ doneAt: plannedSteps.doneAt })
      .from(plannedSteps)
      .where(eq(plannedSteps.plannedRouteId, outing.id));
    if (!canRateOuting({ status: outing.status, steps })) {
      throw httpError(409, 'Only a completed outing with half of its steps done can be rated');
    }
    if (!outing.routeId) {
      throw httpError(409, 'The route of this outing no longer exists');
    }
    const values = {
      rating: body.rating,
      comment: body.comment ?? null,
      plannedRouteId: outing.id,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(routeRatings)
      .values({ ...values, routeId: outing.routeId, userId, createdAt: now })
      .onConflictDoUpdate({ target: [routeRatings.routeId, routeRatings.userId], set: values })
      .returning();
    if (!row) throw new Error('Rating not written');
    const routeRating = await recomputeRouteRating(tx, outing.routeId, now);
    return { ...toMyRating(row), routeRating };
  });
}

/** Erases the ratings of an account, then recomputes the routes they counted in. */
export async function eraseRatingsOf(tx: Tx, userId: string): Promise<void> {
  const erased = await tx
    .delete(routeRatings)
    .where(eq(routeRatings.userId, userId))
    .returning({ routeId: routeRatings.routeId });
  for (const routeId of new Set(erased.map((row) => row.routeId))) {
    await recomputeRouteRating(tx, routeId);
  }
}
