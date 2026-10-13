import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import type { CatalogRouteSort, CatalogRoutesQuery, Plan, RouteStatus } from '@widoo/shared';

/** Filters and columns of the routes of the catalog as their address names them, in French. */
export type CatalogRouteFilter = 'statut' | 'acces';
export type CatalogRouteColumn = 'parcours' | 'auteur' | 'ville' | 'note' | 'modifie';
export type CatalogRoutesListQuery = ListQuery<CatalogRouteFilter, CatalogRouteColumn>;

/** What the address of the list accepts; the last change comes first by default. */
export const catalogRoutesListOptions: ListQueryOptions<CatalogRouteFilter, CatalogRouteColumn> = {
  filters: ['statut', 'acces'],
  sortableColumns: ['parcours', 'auteur', 'ville', 'note', 'modifie'],
  defaultSort: { column: 'modifie', direction: 'desc' },
};

/** Values of the `statut` filter, and the status of the API each one asks for. */
export const statusFilterValues = {
  brouillon: 'draft',
  prive: 'private',
  relecture: 'pending',
  modifications: 'changes_requested',
  publie: 'published',
  'a-corriger': 'needs_fix',
  refuse: 'rejected',
  retire: 'unpublished',
} as const satisfies Record<string, RouteStatus>;

/** Values of the `acces` filter. */
export const accessFilterValues = {
  gratuit: 'free',
  premium: 'premium',
} as const satisfies Record<string, Plan>;

const sortOfColumn: Record<CatalogRouteColumn, CatalogRouteSort> = {
  parcours: 'title',
  auteur: 'author',
  ville: 'city',
  note: 'rating',
  modifie: 'updated',
};

/** The value of a table for a key typed in the address; undefined for an unknown key. */
const valueOf = <Value>(table: Record<string, Value>, key: string | undefined) =>
  key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined;

/** What to ask the API for the list shown at an address; an unknown filter value is dropped. */
export function toCatalogRoutesParams(query: CatalogRoutesListQuery): Partial<CatalogRoutesQuery> {
  return {
    q: query.search || undefined,
    status: valueOf<RouteStatus>(statusFilterValues, query.filters.statut),
    access: valueOf<Plan>(accessFilterValues, query.filters.acces),
    sort: sortOfColumn[query.sort.column],
    direction: query.sort.direction,
    cursor: query.cursor ?? undefined,
  };
}
