import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { PublicProfile, PublicProfileQuery, RouteCard } from '@widoo/shared';
import { api } from '../api/client';
import { useIsOnline } from '../discovery/useRouteSearch';

/** As the route sheet: a profile asked again after 30 seconds. */
const PROFILE_STALE_TIME_MS = 30_000;

export const publicProfileQueryKey = (id: string, query: PublicProfileQuery = {}) =>
  ['users', 'profile', id, query.sort ?? null, query.moods ?? []] as const;

/** What the card or the route sheet already told of the creator: shown while the profile loads. */
export interface KnownCreator {
  firstName: string;
  avatarUrl: string | null;
}

/**
 * What the public profile shows (Ecrans › E-16): the first name and photo known by the card at
 * once, the profile once it answers, nothing to show when it is masked or the account deleted,
 * or the failure with what is known.
 */
export type PublicProfileState =
  | { status: 'loading'; known: KnownCreator | null }
  | {
      status: 'ready';
      profile: PublicProfile;
      /** The published routes of every page loaded, in the order of the sort. */
      routes: RouteCard[];
      /** A new sort or mood under way: the routes shown are those of the previous one. */
      isRefreshing: boolean;
    }
  | { status: 'unavailable' }
  | { status: 'error'; isOffline: boolean; known: KnownCreator | null };

/** No answer reached the device: « Hors connexion » rather than the error of the profile. */
const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

/**
 * The public profile of `id`, its published routes sorted and filtered by `query`, page after
 * page; a new sort keeps the page shown until it answers. It asks even offline, so that the page
 * says it is offline rather than waiting for the network.
 */
export function usePublicProfile(
  id: string,
  query: PublicProfileQuery,
  known: KnownCreator | null,
) {
  const isOnline = useIsOnline();
  const result = useInfiniteQuery({
    queryKey: publicProfileQueryKey(id, query),
    queryFn: ({ pageParam, signal }) =>
      api.getPublicProfile(id, pageParam ? { ...query, cursor: pageParam } : query, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.kind === 'profile' ? last.profile.routes.nextCursor : null),
    networkMode: 'always',
    staleTime: PROFILE_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });

  const pages = result.data?.pages ?? [];
  const first = pages[0];
  let state: PublicProfileState;
  if (first?.kind === 'profile') {
    const routes = pages.flatMap((page) =>
      page.kind === 'profile' ? page.profile.routes.items : [],
    );
    state = {
      status: 'ready',
      profile: first.profile,
      routes,
      isRefreshing: result.isPlaceholderData,
    };
  } else if (first?.kind === 'unavailable') {
    state = { status: 'unavailable' };
  } else if (result.isError) {
    state = { status: 'error', isOffline: !isOnline || isUnreachable(result.error), known };
  } else {
    state = { status: 'loading', known };
  }
  return {
    state,
    retry: () => void result.refetch(),
    hasMore: result.hasNextPage,
    isLoadingMore: result.isFetchingNextPage,
    hasFailedMore: result.isFetchNextPageError,
    loadMore: () => void result.fetchNextPage(),
  };
}
