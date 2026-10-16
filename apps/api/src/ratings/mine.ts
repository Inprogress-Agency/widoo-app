/** The caller's own ratings, read with their outings (E-15, E-08 › Passés). */
import type { MyRouteRating } from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { routeRatings } from '../db/schema';

type RatingRow = typeof routeRatings.$inferSelect;

export const toMyRating = (row: RatingRow): MyRouteRating => ({
  rating: row.rating,
  comment: row.comment,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** The ratings of `userId` on `routeIds`, by route. */
export async function myRatingsOf(
  db: Db | Tx,
  userId: string,
  routeIds: readonly (string | null)[],
): Promise<Map<string, MyRouteRating>> {
  const ids = [...new Set(routeIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select()
    .from(routeRatings)
    .where(and(eq(routeRatings.userId, userId), inArray(routeRatings.routeId, ids)));
  return new Map(rows.map((row) => [row.routeId, toMyRating(row)]));
}
