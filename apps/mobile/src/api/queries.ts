import { skipToken, useQuery } from '@tanstack/react-query';
import type { Bbox } from '../map/geo';
import { api } from './client';

/** The API caches the search for 30 seconds (`Cache-Control: max-age=30`): so does the app. */
const SEARCH_STALE_TIME_MS = 30_000;

/** The map shows the largest page the API serves: the results sheet pages on its own (#28). */
const MAP_PAGE_SIZE = 50;

/** Routes of a map zone; idle until the map knows its zone. */
export function useRouteSearch(zone: Bbox | null) {
  return useQuery({
    queryKey: ['routes', 'search', zone],
    queryFn: zone
      ? ({ signal }) => api.searchRoutes({ bbox: zone, limit: MAP_PAGE_SIZE }, signal)
      : skipToken,
    staleTime: SEARCH_STALE_TIME_MS,
  });
}
