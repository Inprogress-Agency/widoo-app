import {
  onlineManager,
  skipToken,
  useIsRestoring,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { RouteCard } from '@widoo/shared';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { latestCachedResults, searchQueryKey } from '../api/search-cache';
import { createDiscoveryStore, resultsCount, type DiscoveryStore } from './store';

/** The API caches the search for 30 seconds (`Cache-Control: max-age=30`): so does the app. */
const SEARCH_STALE_TIME_MS = 30_000;

/** The map and the sheet show the largest page the API serves; « Voir tout » pages (#62). */
const MAP_PAGE_SIZE = 50;

const noRoutes: RouteCard[] = [];

/** The discovery state of the app, one for the map and the results sheet. */
export const discoveryStore = createDiscoveryStore();

export function useDiscovery<T>(selector: (state: DiscoveryStore) => T): T {
  return useStore(discoveryStore, selector);
}

/** Whether the device has a network, as react-query knows it from expo-network. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () =>
    onlineManager.isOnline(),
  );
}

/** No answer at all: the request never reached the API. */
const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

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
  const client = useQueryClient();
  const isRestoring = useIsRestoring();
  const isOnline = useIsOnline();
  const { data, dataUpdatedAt, error, isError, refetch } = useQuery({
    queryKey: [...searchQueryKey, search?.view.bbox, search?.filters],
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
    const { receive, fail, goOffline } = discoveryStore.getState();
    if (isRestoring) {
      // The last search is being read from the device: it may be the one to show offline.
      return;
    }
    const isCut = !isOnline || (isError && isUnreachable(error));
    if (isCut) {
      // A zone already in the cache shows its results, dated; any other the last ones kept.
      if (data) {
        receive(search.id, data, dataUpdatedAt);
      }
      goOffline(search.id, latestCachedResults(client));
    } else if (data) {
      if (receive(search.id, data, dataUpdatedAt)) {
        analytics.track('map_search_zone', {
          trigger: search.trigger,
          zoom: analyticsZoom(search.view.zoom),
          results_count: resultsCount(data),
        });
      }
    } else if (isError) {
      fail(search.id);
    }
  }, [search, data, dataUpdatedAt, error, isError, isOnline, isRestoring, client]);

  /** « Réessayer »: the same zone and filters again, asked of the API even after a failure. */
  const retry = useCallback(() => {
    const { hasMoved, searchZone } = discoveryStore.getState();
    searchZone('button');
    // A moved map asks for another zone, which the query fetches on its own.
    if (!hasMoved) {
      void refetch();
    }
  }, [refetch]);

  return {
    routes: results?.items ?? noRoutes,
    /**
     * Routes grouped by area when the zone is too large to list them; null otherwise, and when no
     * area holds a route: an empty zone is told as such, never as zero grouped routes.
     */
    clusters: results?.clusters?.length ? results.clusters : null,
    status,
    isOnline,
    retry,
    /** An answered search without any route in the zone. */
    isEmpty: status === 'success' && results !== null && resultsCount(results) === 0,
  };
}
