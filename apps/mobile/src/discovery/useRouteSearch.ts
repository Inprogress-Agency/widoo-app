import { skipToken, useQuery } from '@tanstack/react-query';
import type { RouteCard } from '@widoo/shared';
import { useEffect } from 'react';
import { useStore } from 'zustand';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { createDiscoveryStore, resultsCount, type DiscoveryStore } from './store';

/** The API caches the search for 30 seconds (`Cache-Control: max-age=30`): so does the app. */
const SEARCH_STALE_TIME_MS = 30_000;

/** The map shows the largest page the API serves: the results sheet pages on its own (#28). */
const MAP_PAGE_SIZE = 50;

const noRoutes: RouteCard[] = [];

/** The discovery state of the app, one for the home screen and the sheet to come (#28). */
export const discoveryStore = createDiscoveryStore();

export function useDiscovery<T>(selector: (state: DiscoveryStore) => T): T {
  return useStore(discoveryStore, selector);
}

/** Zoom level sent to analytics: a tenth of a level, with no position (wiki Analytics). */
const analyticsZoom = (zoom: number) => Math.round(zoom * 10) / 10;

/**
 * Runs the search the discovery store asks for, and hands its answer back to the store: the zone
 * and the filters go to the API, the user's position never does. Each answered search sends
 * `map_search_zone`.
 */
export function useRouteSearch() {
  const search = useDiscovery((state) => state.search);
  const status = useDiscovery((state) => state.status);
  const results = useDiscovery((state) => state.results);
  const { data, isError } = useQuery({
    queryKey: ['routes', 'search', search?.view.bbox, search?.filters],
    queryFn: search
      ? ({ signal }) =>
          api.searchRoutes(
            { bbox: search.view.bbox, ...search.filters, limit: MAP_PAGE_SIZE },
            signal,
          )
      : skipToken,
    staleTime: SEARCH_STALE_TIME_MS,
  });

  useEffect(() => {
    if (!search) {
      return;
    }
    const { receive, fail } = discoveryStore.getState();
    if (data) {
      if (receive(search.id, data)) {
        analytics.track('map_search_zone', {
          trigger: search.trigger,
          zoom: analyticsZoom(search.view.zoom),
          results_count: resultsCount(data),
        });
      }
    } else if (isError) {
      fail(search.id);
    }
  }, [search, data, isError]);

  return {
    routes: results?.items ?? noRoutes,
    /**
     * Routes grouped by area when the zone is too large to list them; null otherwise, and when no
     * area holds a route: an empty zone is told as such, never as zero grouped routes.
     */
    clusters: results?.clusters?.length ? results.clusters : null,
    status,
    /** An answered search without any route in the zone. */
    isEmpty: status === 'success' && results !== null && resultsCount(results) === 0,
  };
}
