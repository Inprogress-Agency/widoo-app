/**
 * Rating of a route at the end of an outing (wiki Creation-et-Moderation › Notation des parcours,
 * D-029, D-033, D-087). Rules only: the labels of the ratings belong to the app.
 */

/** A rating goes from 1 to 5 stars. */
export const ratingValues = [1, 2, 3, 4, 5] as const;
export type RatingValue = (typeof ratingValues)[number];

/** « Un mot pour les autres ? »: 280 characters at most. */
export const ratingCommentMaxLength = 280;

/**
 * Steps to have done before rating: half of the route, rounded up (« Note à partir de 2 étapes
 * faites » on a route of 4 or 3). A skipped step is not done, but does not prevent rating (D-033).
 */
export const minDoneStepsToRate = (stepCount: number) => Math.ceil(stepCount / 2);

/** A Go `completed` with at least half of its steps done opens the rating; `stopped` never does. */
export function canRateOuting(outing: {
  status: string;
  steps: readonly { doneAt: unknown }[];
}): boolean {
  if (outing.status !== 'completed') {
    return false;
  }
  const done = outing.steps.filter((step) => step.doneAt !== null).length;
  return done >= minDoneStepsToRate(outing.steps.length);
}

/**
 * A published route enters A-03 for review under 2.5 of average with at least 5 visible ratings
 * (D-086); once the team kept it, again only after 5 new ratings (D-087).
 */
export const lowRatingThreshold = { maxAverage: 2.5, minCount: 5, newRatingsToReopen: 5 } as const;

/** The average and count of the visible ratings call for a `low_rating` report. */
export const isLowRating = (average: number | null, count: number) =>
  average !== null &&
  average < lowRatingThreshold.maxAverage &&
  count >= lowRatingThreshold.minCount;

/** `hidden`: a comment masked by a moderator (A-03); technical keys, never displayed as is. */
export const routeRatingStatuses = ['visible', 'hidden'] as const;
export type RouteRatingStatus = (typeof routeRatingStatuses)[number];
