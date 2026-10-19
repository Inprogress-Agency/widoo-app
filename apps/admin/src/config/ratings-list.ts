import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import { AdminRatingsQuery } from '@widoo/shared';

/** The ratings are filtered by their note and by route; the newest come first, unsorted. */
export type RatingFilter = 'note' | 'parcours';
export type RatingColumn = 'date';
export type RatingsListQuery = ListQuery<RatingFilter, RatingColumn>;

export const ratingsListOptions: ListQueryOptions<RatingFilter, RatingColumn> = {
  filters: ['note', 'parcours'],
  sortableColumns: [],
  defaultSort: { column: 'date', direction: 'desc' },
};

/** Notes of the `note` filter, from 1 to 5. */
export const ratingValues = [1, 2, 3, 4, 5] as const;

/** What to ask the API for the list shown at an address; a note out of 1 to 5, or a route that is not an identifier, is dropped. */
export function toRatingsParams(query: RatingsListQuery): Partial<AdminRatingsQuery> {
  const note = Number(query.filters.note);
  return {
    rating: ratingValues.find((value) => value === note),
    routeId: AdminRatingsQuery.shape.routeId.safeParse(query.filters.parcours).data,
    cursor: query.cursor ?? undefined,
  };
}
