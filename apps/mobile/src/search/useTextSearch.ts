import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import type { GeocodeZone, RouteCard } from '@widoo/shared';
import { useEffect, useRef } from 'react';
import { analytics } from '../analytics';
import { searchApi } from '../api/client';
import { useDebouncedValue } from '../discovery/useDebouncedValue';
import { useIsOnline } from '../discovery/useRouteSearch';
import { parisRegionBbox } from '../map/geo';
import {
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  textSearchView,
  type Group,
  type TextSearchInput,
} from './textSearch';

/** A title search lists every route it finds, up to the largest page of the API. */
const TITLE_PAGE_SIZE = 50;

/** The same text asked again within a minute reads the answer already there. */
const STALE_TIME_MS = 60_000;

/** In memory only: neither key is kept on the device (`shouldPersistQuery`). */
const zonesKey = (text: string) => ['search', 'zones', text] as const;
const routesKey = (text: string) => ['search', 'routes', text] as const;

function groupOf<T>(query: {
  status: Group<T>['status'];
  data: T | undefined;
  isFetching: boolean;
}): Group<T> {
  return { status: query.status, data: query.data, isFetching: query.isFetching };
}

/**
 * The two requests of the search (Ecrans › E-02), sent together once the typing pauses and run
 * apart: the zones of `/geocode`, the routes whose title holds the text. Each gives up after 5 s
 * and is retried alone; neither leaves offline, and neither is kept on the phone. Each answer
 * sends `search_text`, without the text.
 */
export function useTextSearch(rawText: string) {
  const text = rawText.trim();
  const settled = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const isOnline = useIsOnline();
  const isAsked = isOnline && settled.length >= MIN_SEARCH_LENGTH;
  const common = { staleTime: STALE_TIME_MS, retry: false, placeholderData: keepPreviousData };

  const zonesQuery = useQuery({
    ...common,
    queryKey: zonesKey(settled),
    queryFn: isAsked
      ? async ({ signal }): Promise<readonly GeocodeZone[]> =>
          (await searchApi.geocode(settled, signal)).zones
      : skipToken,
  });
  const routesQuery = useQuery({
    ...common,
    queryKey: routesKey(settled),
    queryFn: isAsked
      ? async ({ signal }): Promise<readonly RouteCard[]> =>
          (
            await searchApi.searchRoutes(
              { bbox: parisRegionBbox, q: settled, limit: TITLE_PAGE_SIZE },
              signal,
            )
          ).items
      : skipToken,
  });

  useTrackAnswer('geo', settled, zonesQuery.isPlaceholderData ? undefined : zonesQuery.data);
  useTrackAnswer('route', settled, routesQuery.isPlaceholderData ? undefined : routesQuery.data);

  const input: TextSearchInput = {
    text,
    settled,
    isOnline,
    zones: groupOf(zonesQuery),
    routes: groupOf(routesQuery),
  };
  return {
    input,
    view: textSearchView(input),
    retryZones: () => void zonesQuery.refetch(),
    retryRoutes: () => void routesQuery.refetch(),
  };
}

/** `search_text` once per text and group answered: its kind and whether it found anything. */
function useTrackAnswer(
  kind: 'geo' | 'route',
  text: string,
  answer: readonly unknown[] | undefined,
) {
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (answer === undefined || tracked.current === text) {
      return;
    }
    tracked.current = text;
    analytics.track('search_text', { kind, has_result: answer.length > 0 });
  }, [kind, text, answer]);
}
