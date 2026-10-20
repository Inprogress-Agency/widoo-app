import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { RouteCard, RouteDetail } from '@widoo/shared';
import { useMemo } from 'react';
import { useIsOnline } from '../discovery/useRouteSearch';
import { knownCard } from './knownCard';
import { useRouteSheetSource } from './source';

/**
 * The API never lets the sheet be stored (`no-store`, D-088): it stays in memory while it is read,
 * asked again after 30 seconds, and never persisted (wiki API › Fiche parcours).
 */
const SHEET_STALE_TIME_MS = 30_000;

export const routeSheetQueryKey = (id: string, token?: string) =>
  ['routes', 'sheet', id, token ?? null] as const;

/**
 * What the route sheet shows (Ecrans › E-05): the card of the list at once, the detail once it
 * answers, the date of a withdrawn route, or the failure with what is known.
 */
export type RouteSheetState =
  | { status: 'loading'; known: RouteCard | null }
  | { status: 'ready'; route: RouteDetail }
  | { status: 'removed'; removedAt: string; known: RouteCard | null }
  | { status: 'error'; isOffline: boolean; known: RouteCard | null };

/** No answer reached the device: « Hors connexion » rather than the error of the detail. */
const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

/**
 * The route sheet of `id`, from the source of the app (`useRouteSheetSource`). It asks even
 * offline, so that the sheet says it is offline rather than waiting for the network.
 */
export function useRouteSheet(id: string, token?: string) {
  const source = useRouteSheetSource();
  const client = useQueryClient();
  const isOnline = useIsOnline();
  const known = useMemo(() => knownCard(client, id), [client, id]);
  const query = useQuery({
    queryKey: routeSheetQueryKey(id, token),
    queryFn: ({ signal }) => source.getRoute(id, { token, signal }),
    networkMode: 'always',
    staleTime: SHEET_STALE_TIME_MS,
  });

  let state: RouteSheetState;
  if (query.data?.kind === 'route') {
    state = { status: 'ready', route: query.data.route };
  } else if (query.data?.kind === 'removed') {
    state = { status: 'removed', removedAt: query.data.removedAt, known };
  } else if (query.isError) {
    state = { status: 'error', isOffline: !isOnline || isUnreachable(query.error), known };
  } else {
    state = { status: 'loading', known };
  }
  return { state, retry: () => void query.refetch(), isFetching: query.isFetching };
}
