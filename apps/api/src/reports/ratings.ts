import {
  adminSignalsPageSize,
  type AdminRatings,
  type AdminRatingsQuery,
  type RatingActionResult,
  type RatingAlreadyDecidedDetails,
} from '@widoo/shared';
import { and, count, desc, eq, isNotNull, max } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import type { Db } from '../db/client';
import { routeRatings, routes, users } from '../db/schema';
import { httpError } from '../errors';
import { recomputeRouteRating } from '../ratings/stats';

/** Routes offered by the route filter: the most recently rated, so that the menu stays short. */
const ratedRoutesLimit = 50;

/**
 * The ratings with a comment (A-03), the latest first, masked ones included so that the team can
 * restore them. A rating without a comment has nothing to moderate and is left out.
 */
export async function readRatings(db: Db, query: AdminRatingsQuery): Promise<AdminRatings> {
  const offset = offsetOfCursor(query.cursor);
  const where = and(
    isNotNull(routeRatings.comment),
    query.rating === undefined ? undefined : eq(routeRatings.rating, query.rating),
    query.routeId === undefined ? undefined : eq(routeRatings.routeId, query.routeId),
  );
  const [totals] = await db.select({ value: count() }).from(routeRatings).where(where);
  const rows = await db
    .select({
      id: routeRatings.id,
      rating: routeRatings.rating,
      comment: routeRatings.comment,
      status: routeRatings.status,
      createdAt: routeRatings.createdAt,
      routeId: routes.id,
      routeTitle: routes.title,
      authorId: users.id,
      authorFirstName: users.firstName,
    })
    .from(routeRatings)
    .innerJoin(routes, eq(routes.id, routeRatings.routeId))
    .leftJoin(users, eq(users.id, routeRatings.userId))
    .where(where)
    .orderBy(desc(routeRatings.createdAt), desc(routeRatings.id))
    .limit(adminSignalsPageSize)
    .offset(offset);
  const ratedRoutes = await db
    .select({ id: routes.id, title: routes.title })
    .from(routeRatings)
    .innerJoin(routes, eq(routes.id, routeRatings.routeId))
    .where(isNotNull(routeRatings.comment))
    .groupBy(routes.id, routes.title)
    .orderBy(desc(max(routeRatings.createdAt)))
    .limit(ratedRoutesLimit);
  const total = totals?.value ?? 0;
  return {
    routes: ratedRoutes,
    items: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment ?? '',
      isHidden: row.status === 'hidden',
      createdAt: row.createdAt.toISOString(),
      route: { id: row.routeId, title: row.routeTitle },
      author: row.authorId ? { id: row.authorId, firstName: row.authorFirstName } : null,
    })),
    total,
    offset,
    ...neighbourCursors(offset, total, adminSignalsPageSize),
  };
}

type RatingActionInput = { ratingId: string; actorId: string };

/**
 * Masks a rating (A-03), or restores it when `reason` is absent: a masked rating leaves the
 * reviews of the app and the average of its route, which is recomputed in the same transaction
 * (it may open or close the `low_rating` report). A rating already in the status asked for
 * answers 409 `already_decided`.
 */
async function setRatingStatus(
  db: Db,
  input: RatingActionInput & { status: 'visible' | 'hidden'; reason?: string },
): Promise<RatingActionResult> {
  return db.transaction(async (tx) => {
    const [rating] = await tx
      .select({ status: routeRatings.status, routeId: routeRatings.routeId })
      .from(routeRatings)
      .where(eq(routeRatings.id, input.ratingId))
      .for('update');
    if (!rating) {
      throw httpError(404, 'Rating not found');
    }
    if (rating.status === input.status) {
      const details: RatingAlreadyDecidedDetails = { status: rating.status };
      throw httpError(409, `Rating is already ${rating.status}`, 'already_decided', details);
    }
    await tx
      .update(routeRatings)
      .set({ status: input.status })
      .where(eq(routeRatings.id, input.ratingId));
    const routeRating = await recomputeRouteRating(tx, rating.routeId);
    await recordAdminAction(tx, {
      actorId: input.actorId,
      action: input.status === 'hidden' ? 'rating.hide' : 'rating.unhide',
      targetType: 'rating',
      targetId: input.ratingId,
      before: { status: rating.status },
      after: { status: input.status },
      reason: input.reason,
    });
    return { id: input.ratingId, isHidden: input.status === 'hidden', routeRating };
  });
}

export const hideRating = (db: Db, input: RatingActionInput & { reason: string }) =>
  setRatingStatus(db, { ...input, status: 'hidden' });

export const unhideRating = (db: Db, input: RatingActionInput) =>
  setRatingStatus(db, { ...input, status: 'visible' });
