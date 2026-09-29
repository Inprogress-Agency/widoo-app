import type { RouteCard } from './schemas/route';
import type { RouteFilterGroup, RouteSearchQuery } from './schemas/search';

/** Active filters of a search: a missing or empty group filters nothing. */
export type RouteFilters = Pick<RouteSearchQuery, RouteFilterGroup>;

type FilterCard = Pick<
  RouteCard,
  'audiences' | 'moods' | 'conditions' | 'durationBucket' | 'budgetBucket' | 'transport'
>;

/** A group without values lets every card through. */
function passes<T>(values: readonly T[] | undefined, test: (values: readonly T[]) => boolean) {
  return !values?.length || test(values);
}

/**
 * Whether a card passes the filters, as the search of the API reads them (wiki
 * Filtres-et-Recherche › logique de combinaison): every group, at least one public, ambiance,
 * bucket or transport of each, and every condition, which are requirements. The app filters with
 * it the cards kept offline (Ecrans › E-03, hors connexion).
 */
export function matchesFilters(card: FilterCard, filters: RouteFilters): boolean {
  return (
    passes(filters.audiences, (values) => values.some((value) => card.audiences.includes(value))) &&
    passes(filters.moods, (values) => values.some((value) => card.moods.includes(value))) &&
    passes(filters.conditions, (values) =>
      values.every((value) => card.conditions.includes(value)),
    ) &&
    passes(filters.durations, (values) => values.includes(card.durationBucket)) &&
    passes(filters.budgets, (values) => values.includes(card.budgetBucket)) &&
    passes(filters.transports, (values) => values.includes(card.transport))
  );
}
