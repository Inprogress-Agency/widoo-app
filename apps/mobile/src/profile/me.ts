import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { AppConfig, Me, UpdateMe } from '@widoo/shared';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { meQueryPrefix, OFFLINE_MAX_AGE_MS } from '../api/search-cache';
import { session, useSession } from '../auth';
import { useIsOnline } from '../discovery/useRouteSearch';

/** The account of `uid`: another account signed in on the phone never reads it. */
export const meQueryKey = (uid: string) => [...meQueryPrefix, uid] as const;

const configQueryKey = ['config'] as const;

/** No answer reached the device: the profile kept on the phone is shown instead. */
export const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

/**
 * What the Profil tab shows (Ecrans › E-09): no account, the profile, the last one kept on the
 * phone while offline (« Hors connexion. Profil enregistré sur ce téléphone. »), or the failure.
 */
export type MeState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'ready'; me: Me; isOffline: boolean }
  | { status: 'error' };

/**
 * The signed-in account, from `GET /me`. Kept on the phone without its e-mail (`deviceCopy`), so
 * that the profile shows offline: offline, the query pauses and keeps its answer, which the
 * persister keeps writing.
 */
export function useMe() {
  const sessionStatus = useSession((state) => state.status);
  const uid = useSession((state) => state.user?.uid ?? null);
  const isOnline = useIsOnline();
  const query = useQuery({
    queryKey: meQueryKey(uid ?? ''),
    queryFn: ({ signal }) => api.getMe(signal),
    enabled: uid !== null,
    gcTime: OFFLINE_MAX_AGE_MS,
  });

  let state: MeState;
  if (sessionStatus === 'anonymous') {
    state = { status: 'anonymous' };
  } else if (query.data) {
    const isOffline = !isOnline || (query.isError && isUnreachable(query.error));
    state = { status: 'ready', me: query.data, isOffline };
  } else if (query.isError || query.fetchStatus === 'paused') {
    // Nothing kept on the phone, and no answer: offline on the very first opening.
    state = { status: 'error' };
  } else {
    state = { status: 'loading' };
  }
  return { state, refetch: () => void query.refetch(), isFetching: query.isFetching };
}

/** `/config`: the active anecdote questions, in the order of the sheet. */
export function useAppConfig() {
  return useQuery<AppConfig>({
    queryKey: configQueryKey,
    queryFn: ({ signal }) => api.getConfig(signal),
    staleTime: Infinity,
  });
}

/** `PATCH /me` in one request; the profile shown takes the answer. */
export function useUpdateMe() {
  const client = useQueryClient();
  const uid = useSession((state) => state.user?.uid ?? null);
  return useMutation({
    mutationFn: (update: UpdateMe) => api.updateMe(update),
    // A save is sent now or fails: never queued for later behind the user's back.
    networkMode: 'always',
    onSuccess: (me) => {
      if (uid) {
        client.setQueryData(meQueryKey(uid), me);
      }
    },
  });
}

/**
 * Deletes the account (D-025): `DELETE /me`, then the sign-out, which brings the app back to its
 * anonymous state; the profile kept on the phone goes with the session.
 */
export async function deleteAccount(): Promise<void> {
  await api.deleteMe();
  await session.signOut();
}

/** Forgets every profile kept on the phone and in memory. */
export function forgetProfiles(client: QueryClient) {
  client.removeQueries({ queryKey: meQueryPrefix });
}

// Signed out, by « Se déconnecter », the deletion or a deleted account: nothing of the account
// stays on the phone.
session.store.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'anonymous') {
    forgetProfiles(queryClient);
  }
});
