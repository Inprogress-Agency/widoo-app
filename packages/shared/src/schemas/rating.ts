import { z } from 'zod';
import { ratingCommentMaxLength } from '../ratings';
import { multilineText } from './common';
import { RouteReview } from './route-detail';

const Rating = z.number().int().min(1).max(5);

/**
 * Body of `POST /me/planned/:id/rating` (E-15): the rating, and the comment offered once it is
 * given; no comment, or an empty one, removes the earlier comment.
 */
export const RateRoute = z.strictObject({
  rating: Rating,
  comment: z
    .union([multilineText(ratingCommentMaxLength), z.literal('').transform(() => null)])
    .nullish(),
});
export type RateRoute = z.infer<typeof RateRoute>;

/** The caller's rating of a route, one per user and per route (E-15, E-08 › Passés). */
export const MyRouteRating = z.object({
  rating: Rating,
  comment: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type MyRouteRating = z.infer<typeof MyRouteRating>;

/** Query of `GET /routes/:id/ratings`. */
export const RouteRatingsQuery = z.strictObject({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type RouteRatingsQuery = z.infer<typeof RouteRatingsQuery>;

/** The visible reviews of a route, newest first (E-05 › « Voir les 128 avis »). */
export const RouteRatingList = z.object({
  items: z.array(RouteReview),
  nextCursor: z.string().nullable(),
});
export type RouteRatingList = z.infer<typeof RouteRatingList>;
