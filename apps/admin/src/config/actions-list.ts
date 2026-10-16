import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import type { AdminActionPeriod, AdminActionsQuery } from '@widoo/shared';

/** The journal is read most recent first, with no column to sort by: only its four filters. */
export type ActionFilter = 'auteur' | 'action' | 'cible' | 'periode';
export type ActionColumn = 'date';
export type ActionsListQuery = ListQuery<ActionFilter, ActionColumn>;

export const actionsListOptions: ListQueryOptions<ActionFilter, ActionColumn> = {
  filters: ['auteur', 'action', 'cible', 'periode'],
  sortableColumns: [],
  defaultSort: { column: 'date', direction: 'desc' },
};

/** Values of the `periode` filter, and the period of the API each one asks for. */
export const periodFilterValues = {
  jour: '24h',
  semaine: '7d',
  mois: '30d',
} as const satisfies Record<string, AdminActionPeriod>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What to ask the API for the list shown at an address; an unknown value is dropped. */
export function toActionsParams(query: ActionsListQuery): Partial<AdminActionsQuery> {
  const { auteur, action, cible, periode } = query.filters;
  return {
    actorId: auteur !== undefined && uuidPattern.test(auteur) ? auteur : undefined,
    action,
    targetType: cible,
    period:
      periode !== undefined && Object.hasOwn(periodFilterValues, periode)
        ? periodFilterValues[periode as keyof typeof periodFilterValues]
        : undefined,
    cursor: query.cursor ?? undefined,
  };
}
