import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import {
  taxonomies,
  type CatalogPlaceSort,
  type CatalogPlacesQuery,
  type PlaceCategory,
  type VerificationStatus,
} from '@widoo/shared';

/** Filters and columns of the places of the catalog as their address names them, in French. */
export type CatalogPlaceFilter = 'categorie' | 'statut';
export type CatalogPlaceColumn = 'lieu' | 'categorie' | 'ville' | 'verifie' | 'parcours';
export type CatalogPlacesListQuery = ListQuery<CatalogPlaceFilter, CatalogPlaceColumn>;

/** What the address of the list accepts; by name by default. */
export const catalogPlacesListOptions: ListQueryOptions<CatalogPlaceFilter, CatalogPlaceColumn> = {
  filters: ['categorie', 'statut'],
  sortableColumns: ['lieu', 'categorie', 'ville', 'verifie', 'parcours'],
  defaultSort: { column: 'lieu', direction: 'asc' },
};

/** Values of the `statut` filter, and the verification status each one asks for. */
export const placeStatusFilterValues = {
  verifie: 'verified',
  'a-verifier': 'stale',
  signale: 'flagged',
  ferme: 'closed',
} as const satisfies Record<string, VerificationStatus>;

const sortOfColumn: Record<CatalogPlaceColumn, CatalogPlaceSort> = {
  lieu: 'name',
  categorie: 'category',
  ville: 'city',
  verifie: 'verified',
  parcours: 'routes',
};

/** What to ask the API for the list shown at an address; an unknown filter value is dropped. */
export function toCatalogPlacesParams(query: CatalogPlacesListQuery): Partial<CatalogPlacesQuery> {
  const { categorie, statut } = query.filters;
  return {
    q: query.search || undefined,
    // The category travels as its technical key, the same as in the taxonomy.
    category: taxonomies.placeCategories.find((category: PlaceCategory) => category === categorie),
    status:
      statut !== undefined && Object.hasOwn(placeStatusFilterValues, statut)
        ? placeStatusFilterValues[statut as keyof typeof placeStatusFilterValues]
        : undefined,
    sort: sortOfColumn[query.sort.column],
    direction: query.sort.direction,
    cursor: query.cursor ?? undefined,
  };
}
