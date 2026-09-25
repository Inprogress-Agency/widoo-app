import { skipToken, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { LatLng, RouteCard } from '@widoo/shared';
import { useCallback, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { searchQueryKey } from '../api/search-cache';
import {
  effectiveSort,
  mergePages,
  sectionListStatus,
  serverSort,
  sortByDistance,
  type PagesStatus,
} from './sections';
import { resultsCount } from './store';
import { discoveryStore, useDiscovery, useIsOnline } from './useRouteSearch';

/** Routes of a page of « Voir tout »: the API's default page, quick to answer. */
const LIST_PAGE_SIZE = 20;

/** The distance sort reads the whole zone on the device, in the largest pages the API serves. */
const DISTANCE_PAGE_SIZE = 50;

/** At most this many pages for the distance sort: 1,000 routes, far beyond a listed zone. */
const MAX_DISTANCE_PAGES = 20;

/** The API caches the count for 30 seconds, as the search. */
const COUNT_STALE_TIME_MS = 30_000;

/** Kept in memory only: the persister writes the zone searches, never the lists. */
const listQueryKey = ['routes', 'list'] as const;

const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

const noRoutes: RouteCard[] = [];

/**
 * How many routes the zone of the sheet holds over all its pages, for « N parcours »: the
 * routes listed when they fit one page, the count of the API otherwise; null until known.
 */
export function useZoneCount(): number | null {
  const search = useDiscovery((state) => state.search);
  const results = useDiscovery((state) => state.results);
  const hasMore = results?.nextCursor != null;
  const { data } = useQuery({
    queryKey: ['routes', 'count', search?.view.bbox, search?.filters],
    queryFn:
      search && hasMore
        ? ({ signal }) => api.countRoutes({ bbox: search.view.bbox, ...search.filters }, signal)
        : skipToken,
    staleTime: COUNT_STALE_TIME_MS,
  });
  if (!results) {
    return null;
  }
  return hasMore ? (data?.count ?? null) : resultsCount(results);
}

/**
 * The routes of a section of the sheet in the sort chosen (Ecrans › E-04, « Voir tout »). The
 * zone and the filters are the sheet's: in the recommended sort, its results are the first page,
 * so that opening the list asks nothing of the API; a next page, or another sort, does, from its
 * cursor. The distance sort is made on the device from the whole zone: the position never leaves
 * it (Securite-et-RGPD).
 */
export function useSectionList(position: LatLng | null) {
  const client = useQueryClient();
  const search = useDiscovery((state) => state.search);
  const zone = useDiscovery((state) => state.status);
  const results = useDiscovery((state) => state.results);
  const resultsAt = useDiscovery((state) => state.resultsAt);
  const chosenSort = useDiscovery((state) => state.sort);
  const isOnline = useIsOnline();
  const sort = effectiveSort(chosenSort, position !== null);
  const apiSort = serverSort(sort);
  const isDistance = sort === 'distance';
  const hasZoneResults = results !== null && (zone === 'success' || zone === 'offline');

  const query = useInfiniteQuery({
    // A new answer of the zone starts the list over.
    queryKey: [...listQueryKey, search?.id, resultsAt, apiSort],
    queryFn:
      search && hasZoneResults
        ? ({ pageParam, signal }) =>
            api.searchRoutes(
              {
                bbox: search.view.bbox,
                ...search.filters,
                sort: apiSort,
                cursor: pageParam ?? undefined,
                limit: isDistance ? DISTANCE_PAGE_SIZE : LIST_PAGE_SIZE,
              },
              signal,
            )
        : skipToken,
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    initialData:
      apiSort === 'recommended' && results ? { pages: [results], pageParams: [null] } : undefined,
    initialDataUpdatedAt: resultsAt ?? undefined,
    // The pages stay as they came: a refetch would ask again every page already read.
    staleTime: Infinity,
  });
  const {
    data,
    error,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch,
    dataUpdatedAt,
  } = query;
  const pageCount = data?.pages.length ?? 0;
  const isZoneRead = !hasNextPage || pageCount >= MAX_DISTANCE_PAGES;

  // The distance sort needs every route of the zone before it can tell the nearest.
  useEffect(() => {
    if (isDistance && !isZoneRead && !isFetchingNextPage && !isFetchNextPageError && isOnline) {
      void fetchNextPage();
    }
  }, [isDistance, isZoneRead, isFetchingNextPage, isFetchNextPageError, isOnline, fetchNextPage]);

  const merged = useMemo(() => (data ? mergePages(data.pages) : noRoutes), [data]);
  const routes = useMemo(
    () => (isDistance && position ? sortByDistance(merged, position) : merged),
    [isDistance, position, merged],
  );

  const isCut = !isOnline || (error !== null && isUnreachable(error));
  let pages: PagesStatus = 'success';
  if (!data) {
    pages = error ? (isCut ? 'offline' : 'error') : isCut ? 'offline' : 'pending';
  } else if (isDistance && !isZoneRead) {
    pages = isFetchNextPageError ? (isCut ? 'offline' : 'error') : 'pending';
  }
  const status = sectionListStatus({
    zone,
    hasZoneResults,
    pages,
    routeCount: routes.length,
  });

  /** The next page, at the end of the list; never offline, nor after a failed page. */
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isDistance && isOnline) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isDistance, isOnline, fetchNextPage]);

  /** « Réessayer »: the zone of the sheet when it failed, the pages of the sort otherwise. */
  const retry = useCallback(() => {
    if (zone === 'error' || !hasZoneResults) {
      const { searchZone, search: current } = discoveryStore.getState();
      searchZone('button');
      if (current) {
        void client.refetchQueries({
          queryKey: [...searchQueryKey, current.view.bbox, current.filters],
        });
      }
    } else if (data && hasNextPage) {
      void fetchNextPage();
    } else {
      void refetch();
    }
  }, [zone, hasZoneResults, client, data, hasNextPage, fetchNextPage, refetch]);

  return {
    routes,
    sort,
    status,
    /** A next page is on its way: the ring at the foot of the list. */
    isLoadingMore: isFetchingNextPage && !isDistance,
    /** A next page failed: « Réessayer » at the foot of the list. */
    hasFailedMore: isFetchNextPageError && !isDistance && status === 'ready',
    loadMore,
    retry,
    /** Offline: when the routes on screen were fetched, « résultats du … ». */
    fetchedAt: isCut && data ? dataUpdatedAt : null,
  };
}
