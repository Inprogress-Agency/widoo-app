import { skipToken, useQuery } from '@tanstack/react-query';
import { analytics } from '../analytics';
import { filtersEvent } from '../analytics/discovery';
import { api } from '../api/client';
import type { Bbox } from '../map/geo';
import {
  COUNT_DEBOUNCE_MS,
  COUNT_TIMEOUT_MS,
  filterCountOf,
  type FilterCount,
} from './filterCount';
import type { SearchFilters } from './store';
import { useDebouncedValue } from './useDebouncedValue';
import { useDiscovery, useIsOnline } from './useRouteSearch';

/** The API caches the count for 30 seconds, as the search. */
const COUNT_STALE_TIME_MS = 30_000;

/**
 * The count, given up after `COUNT_TIMEOUT_MS`: the panel then offers its button without number.
 * A zero result sends `filters_no_results`, once per count asked.
 */
async function countWithin(filters: SearchFilters, bbox: Bbox, signal: AbortSignal) {
  const late = new AbortController();
  const timer = setTimeout(() => late.abort(), COUNT_TIMEOUT_MS);
  const cancel = () => late.abort();
  signal.addEventListener('abort', cancel);
  try {
    const result = await api.countRoutes(
      { bbox, ...filters, breakdown: 'all_but_one' },
      late.signal,
    );
    if (result.count === 0) {
      analytics.track('filters_no_results', filtersEvent(filters));
    }
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}

/**
 * « Voir N parcours » of the panel (Ecrans › E-03): the routes of the zone on screen with the
 * filters of the panel, counted 300 ms after the last tap, with the count without each group for
 * the zero result. A failed count is not retried on its own: the next tap on a chip asks again.
 */
export function useFilterCount(filters: SearchFilters): FilterCount {
  const bbox = useDiscovery((state) => state.view?.bbox);
  const isOnline = useIsOnline();
  const settled = useDebouncedValue(filters, COUNT_DEBOUNCE_MS);
  const { data, isError } = useQuery({
    queryKey: ['routes', 'count', 'breakdown', bbox, settled],
    queryFn: bbox && isOnline ? ({ signal }) => countWithin(settled, bbox, signal) : skipToken,
    staleTime: COUNT_STALE_TIME_MS,
    retry: false,
  });

  return filterCountOf({
    isOnline,
    isWaiting: settled !== filters,
    data,
    isError,
    filters: settled,
  });
}
