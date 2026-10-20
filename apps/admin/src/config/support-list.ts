import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import { adminSupportStatuses, type AdminSupportQuery } from '@widoo/shared';

/** The messages are filtered by their status; the ones to handle come first, and cannot be sorted. */
export type SupportFilter = 'statut';
export type SupportColumn = 'date';
export type SupportListQuery = ListQuery<SupportFilter, SupportColumn>;

export const supportListOptions: ListQueryOptions<SupportFilter, SupportColumn> = {
  filters: ['statut'],
  sortableColumns: [],
  defaultSort: { column: 'date', direction: 'asc' },
};

/** What to ask the API for the list shown at an address; a status it does not know is dropped. */
export function toSupportParams(query: SupportListQuery): Partial<AdminSupportQuery> {
  return {
    status: adminSupportStatuses.find((status) => status === query.filters.statut),
    cursor: query.cursor ?? undefined,
  };
}
