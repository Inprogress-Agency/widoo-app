import type { PlannedRoute, RateRoute } from '@widoo/shared';

/** The rating and comment E-15 gives: an empty comment is none. */
export interface GivenRating {
  rating: number;
  comment: string;
}

/** The body of `POST /me/planned/:id/rating` for what E-15 gives. */
export const bodyOf = (given: GivenRating): RateRoute => ({
  rating: given.rating,
  comment: given.comment.trim() || null,
});

/** Whether E-15 changed anything of the rating the outing already had: else nothing is sent. */
export function isRatingChanged(outing: PlannedRoute, given: GivenRating | null): boolean {
  if (!given) {
    return false;
  }
  const mine = outing.myRating;
  return mine === null || given.rating !== mine.rating || bodyOf(given).comment !== mine.comment;
}
