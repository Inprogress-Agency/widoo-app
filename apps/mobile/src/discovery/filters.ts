import {
  matchesFilters,
  taxonomies,
  type RouteFilterGroup,
  type RouteSearchResult,
} from '@widoo/shared';
import type { SearchFilters } from './store';

/** A value of a filter group: `culture` of `moods`. */
export type FilterValue<G extends RouteFilterGroup = RouteFilterGroup> = NonNullable<
  SearchFilters[G]
>[number];

/** A filter value with its group, as a chip carries it. */
export type Filter = {
  [G in RouteFilterGroup]: { group: G; value: FilterValue<G> };
}[RouteFilterGroup];

/** Groups in the order of the panel (Ecrans › E-03): Public, Budget, Durée, Déplacement... */
export const panelGroups = [
  'audiences',
  'budgets',
  'durations',
  'transports',
  'moods',
  'conditions',
] as const satisfies readonly RouteFilterGroup[];

/** Every value of a group, in the order of its taxonomy. */
export function groupFilters<G extends RouteFilterGroup>(group: G): Filter[] {
  const values: readonly FilterValue<G>[] = taxonomies[group];
  return values.map((value) => ({ group, value }) as Filter);
}

/**
 * Quick chips of the home, in this order (Filtres-et-Recherche › Chips rapides de l'accueil):
 * Gratuit, the publics, Extérieur, then the moods.
 */
export const quickFilters: readonly Filter[] = [
  { group: 'budgets', value: 'free' },
  { group: 'audiences', value: 'couple' },
  { group: 'audiences', value: 'solo' },
  { group: 'audiences', value: 'family' },
  { group: 'audiences', value: 'friends' },
  { group: 'conditions', value: 'outdoor' },
  ...groupFilters('moods'),
];

export function isActive(filters: SearchFilters, { group, value }: Filter): boolean {
  const values: readonly string[] = filters[group] ?? [];
  return values.includes(value);
}

/** Active filters, group after group in the order of the panel. */
export function activeFilters(filters: SearchFilters): Filter[] {
  return panelGroups.flatMap((group) => groupFilters(group).filter((f) => isActive(filters, f)));
}

/**
 * The filters with one value added or removed. Values keep the order of their taxonomy and an
 * emptied group goes away: the same filters always make the same search, and the same cache key.
 */
export function toggleFilter(filters: SearchFilters, filter: Filter): SearchFilters {
  const isOn = !isActive(filters, filter);
  const values: readonly string[] = taxonomies[filter.group];
  const next = values.filter((value) =>
    value === filter.value ? isOn : isActive(filters, { ...filter, value } as Filter),
  );
  return withGroup(filters, filter.group, next);
}

/** The filters without a whole group: the suggestions of the zero result. */
export function removeGroup(filters: SearchFilters, group: RouteFilterGroup): SearchFilters {
  return withGroup(filters, group, []);
}

function withGroup(
  filters: SearchFilters,
  group: RouteFilterGroup,
  values: readonly string[],
): SearchFilters {
  const others: [string, readonly string[]][] = Object.entries(filters).filter(
    ([key]) => key !== group,
  );
  if (values.length > 0) {
    others.push([group, values]);
  }
  return Object.fromEntries(others) as SearchFilters;
}

/**
 * Results kept offline, filtered on the device (Ecrans › E-03, hors connexion). Clusters are
 * counted by the API alone: they stay as they came.
 */
export function filterResults(
  result: RouteSearchResult,
  filters: SearchFilters,
): RouteSearchResult {
  const items = result.items.filter((route) => matchesFilters(route, filters));
  return items.length === result.items.length ? result : { ...result, items };
}
