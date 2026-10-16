import { onlineManager, useQuery } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { OwnRouteSummary, PlannedRoute, PlannedRouteStatus } from '@widoo/shared';
import { api } from '../api/client';
import { OFFLINE_MAX_AGE_MS } from '../api/search-cache';
import { useSession } from '../auth';
import { useIsOnline } from '../discovery/useRouteSearch';
import { listPlanned, plannedQueryKey } from '../plan/planned';
import { pastOutings } from './lists';

/**
 * The lists of E-08, each in its query under the account. The past outings sit under the key of
 * the plannings, `['planned', uid]`: programming, the Go and the rating refresh them already.
 */
export const pastQueryKey = (uid: string) => [...plannedQueryKey(uid), 'past'] as const;
export const myRoutesQueryKey = (uid: string) => ['my-routes', uid] as const;

const PAGE = 50;
/** Ten pages of fifty: far more than a person plans; the API orders them by start. */
const MAX_PAGES = 10;

async function allOfStatus(status: PlannedRouteStatus, signal?: AbortSignal) {
  const items: PlannedRoute[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const list = await api.listPlanned({ status, cursor, limit: PAGE }, signal);
    items.push(...list.items);
    if (!list.nextCursor) {
      break;
    }
    cursor = list.nextCursor;
  }
  return items;
}

const fetchPast = async ({ signal }: { signal?: AbortSignal }) =>
  pastOutings(
    (
      await Promise.all(
        (['completed', 'stopped', 'missed'] as const).map((status) => allOfStatus(status, signal)),
      )
    ).flat(),
  );

const fetchMyRoutes = ({ signal }: { signal?: AbortSignal }) =>
  api.listMyRoutes({ limit: PAGE }, signal).then((list) => list.items);

const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

/** A list of E-08: loading, failed, or its items, and whether they come from before the network. */
export type ListState<T> =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: T[]; isOffline: boolean };

function useList<D, T>(
  queryKey: readonly unknown[],
  queryFn: (context: { signal?: AbortSignal }) => Promise<D>,
  itemsOf: (data: D) => T[],
) {
  const uid = useSession((state) => state.user?.uid ?? null);
  const isOnline = useIsOnline();
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: uid !== null,
    // Offline, the lists stay readable as last received (Ecrans › E-08, hors connexion).
    gcTime: OFFLINE_MAX_AGE_MS,
  });
  let state: ListState<T>;
  if (query.data) {
    state = {
      status: 'ready',
      items: itemsOf(query.data),
      isOffline: !isOnline || (query.isError && isUnreachable(query.error)),
    };
  } else if (query.isError) {
    state = { status: 'error' };
  } else {
    state = { status: 'loading' };
  }
  const refetch = () => {
    if (onlineManager.isOnline()) {
      void query.refetch();
    }
  };
  return { state, refetch };
}

/** « À venir »: the plannings to come, the next first. */
export function useUpcoming() {
  const uid = useSession((state) => state.user?.uid ?? '');
  // The same query as the route sheet's, which tells whether a route is planned.
  return useList(plannedQueryKey(uid), listPlanned, (list) => list.items);
}

/** « Passés »: the outings done, stopped or not done, the latest first. */
export function usePast() {
  const uid = useSession((state) => state.user?.uid ?? '');
  return useList(pastQueryKey(uid), fetchPast, (items) => items);
}

/** « Créés »: my routes, every status, the newest first. */
export function useMyRoutes() {
  const uid = useSession((state) => state.user?.uid ?? '');
  return useList(myRoutesQueryKey(uid), fetchMyRoutes, (items: OwnRouteSummary[]) => items);
}
