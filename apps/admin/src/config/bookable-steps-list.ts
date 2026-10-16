import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import type { BookableStepsQuery } from '@widoo/shared';

/** The steps are read most clicked first, with no column to sort by: only the one filter. */
export type BookableStepFilter = 'sans-partenaire';
export type BookableStepColumn = 'clics';
export type BookableStepsListQuery = ListQuery<BookableStepFilter, BookableStepColumn>;

export const bookableStepsListOptions: ListQueryOptions<BookableStepFilter, BookableStepColumn> = {
  filters: ['sans-partenaire'],
  sortableColumns: [],
  defaultSort: { column: 'clics', direction: 'desc' },
};

/** Value of the `sans-partenaire` filter when it applies. */
export const withoutPartnerValue = 'oui';

/** What to ask the API for the list shown at an address. */
export function toBookableStepsParams(query: BookableStepsListQuery): Partial<BookableStepsQuery> {
  return {
    withoutPartnerLink:
      query.filters['sans-partenaire'] === withoutPartnerValue ? 'true' : undefined,
    cursor: query.cursor ?? undefined,
  };
}
