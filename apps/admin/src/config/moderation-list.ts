import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import type { ModerationQueueParams } from '@widoo/api-client';
import type { ModerationQueueSort, ModerationQueueStatus } from '@widoo/shared';

/** Filters and columns of the moderation queue as its address names them, in French. */
export type ModerationFilter = 'statut' | 'retard' | 'revision' | 'ville';
export type ModerationColumn = 'parcours' | 'auteur' | 'ville' | 'alertes' | 'file';
export type ModerationListQuery = ListQuery<ModerationFilter, ModerationColumn>;

/** What the address of the queue accepts; the oldest in the queue comes first by default. */
export const moderationListOptions: ListQueryOptions<ModerationFilter, ModerationColumn> = {
  filters: ['statut', 'retard', 'revision', 'ville'],
  sortableColumns: ['parcours', 'auteur', 'ville', 'alertes', 'file'],
  defaultSort: { column: 'file', direction: 'asc' },
};

/** Value of the `retard` and `revision` filters when they are on. */
export const onFilterValue = 'oui';

/** Values of the `statut` filter, and the status of the API each one asks for. */
export const statusFilterValues = {
  relecture: 'pending',
  modifications: 'changes_requested',
} as const satisfies Record<string, ModerationQueueStatus>;

export type StatusFilterValue = keyof typeof statusFilterValues;

const sortOfColumn: Record<ModerationColumn, ModerationQueueSort> = {
  parcours: 'title',
  auteur: 'author',
  ville: 'city',
  alertes: 'warnings',
  file: 'waiting',
};

const isStatusFilterValue = (value: string | undefined): value is StatusFilterValue =>
  value !== undefined && value in statusFilterValues;

// The identifier of a city, as the API gives it: anything else typed in the address is dropped.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What to ask the API for the queue shown at an address; an unknown filter value is dropped. */
export function toModerationQueueParams(query: ModerationListQuery): ModerationQueueParams {
  const status = query.filters.statut;
  return {
    status: isStatusFilterValue(status) ? statusFilterValues[status] : undefined,
    city: uuidPattern.test(query.filters.ville ?? '') ? query.filters.ville : undefined,
    late: query.filters.retard === onFilterValue ? 'true' : undefined,
    revision: query.filters.revision === onFilterValue ? 'true' : undefined,
    q: query.search || undefined,
    sort: sortOfColumn[query.sort.column],
    direction: query.sort.direction,
    cursor: query.cursor ?? undefined,
  };
}
