import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import type { AdminReportsQuery, RouteReportReason } from '@widoo/shared';

/** The reports are read oldest first, with no column to sort by: only the reason filters them. */
export type ReportFilter = 'motif';
export type ReportColumn = 'signale';
export type ReportsListQuery = ListQuery<ReportFilter, ReportColumn>;

export const reportsListOptions: ListQueryOptions<ReportFilter, ReportColumn> = {
  filters: ['motif'],
  sortableColumns: [],
  defaultSort: { column: 'signale', direction: 'asc' },
};

/** Values of the `motif` filter, and the reason of the API each one asks for. */
export const reasonFilterValues = {
  'lieu-modifie': 'place_changed',
  inapproprie: 'inappropriate',
  dangereux: 'dangerous_place',
  publicite: 'hidden_ad',
  copie: 'copied_content',
  faux: 'false_info',
  autre: 'other',
  'note-basse': 'low_rating',
} as const satisfies Record<string, RouteReportReason>;

/** What to ask the API for the list shown at an address; an unknown reason is dropped. */
export function toReportsParams(query: ReportsListQuery): Partial<AdminReportsQuery> {
  const motif = query.filters.motif;
  return {
    reason:
      motif !== undefined && Object.hasOwn(reasonFilterValues, motif)
        ? reasonFilterValues[motif as keyof typeof reasonFilterValues]
        : undefined,
    cursor: query.cursor ?? undefined,
  };
}
