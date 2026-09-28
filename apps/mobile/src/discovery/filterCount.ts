import type { RouteCount, RouteFilterGroup } from '@widoo/shared';
import { groupFilters, isActive, panelGroups, type Filter } from './filters';
import type { SearchFilters } from './store';

/** The count waits for the taps to pause (Filtres-et-Recherche › logique de combinaison). */
export const COUNT_DEBOUNCE_MS = 300;

/** Without an answer after this long, the count is told unavailable (Ecrans › E-03, états). */
export const COUNT_TIMEOUT_MS = 5_000;

/** « Essayez de retirer : » offers three filters at most. */
const MAX_SUGGESTIONS = 3;

/** A group to remove at zero result, with the routes it would bring back. */
export interface Suggestion {
  group: RouteFilterGroup;
  /** Its active values: the API counts group by group, never value by value. */
  filters: Filter[];
  gain: number;
}

/**
 * What the button of the panel shows: a spinner while counting, the count, the button without
 * number when the count fails or is late, or offline.
 */
export type FilterCount =
  | { status: 'counting' }
  | { status: 'counted'; count: number; suggestions: Suggestion[] }
  | { status: 'unavailable' }
  | { status: 'offline' };

/**
 * At zero result, the groups whose removal brings routes back, the most useful first (Ecrans ›
 * E-03, aucun parcours), from the count « tous les filtres sauf un » of the API.
 */
export function suggestionsOf(result: RouteCount, filters: SearchFilters): Suggestion[] {
  const { count, without } = result;
  if (count > 0 || !without) {
    return [];
  }
  const suggestions = panelGroups.flatMap((group) => {
    const gain = (without[group] ?? count) - count;
    const active = groupFilters(group).filter((filter) => isActive(filters, filter));
    return gain > 0 && active.length > 0 ? [{ group, filters: active, gain }] : [];
  });
  // A stable sort: two groups of the same gain keep the order of the panel.
  return suggestions.sort((a, b) => b.gain - a.gain).slice(0, MAX_SUGGESTIONS);
}

interface CountState {
  isOnline: boolean;
  /** The filters changed less than the debounce ago: nothing is asked yet. */
  isWaiting: boolean;
  /** The count of the filters counted, once answered. */
  data: RouteCount | undefined;
  /** The count failed, or took longer than `COUNT_TIMEOUT_MS`. */
  isError: boolean;
  filters: SearchFilters;
}

export function filterCountOf({
  isOnline,
  isWaiting,
  data,
  isError,
  filters,
}: CountState): FilterCount {
  if (!isOnline) {
    return { status: 'offline' };
  }
  if (isWaiting || (!data && !isError)) {
    return { status: 'counting' };
  }
  if (!data) {
    return { status: 'unavailable' };
  }
  return { status: 'counted', count: data.count, suggestions: suggestionsOf(data, filters) };
}
