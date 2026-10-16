import { onlineManager, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { PlannedRoute, RateRoute } from '@widoo/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createMMKV } from 'react-native-mmkv';
import { useStore } from 'zustand';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { session } from '../auth';
import { useIsOnline } from '../discovery/useRouteSearch';
import { plannedQueryKey } from '../plan/planned';
import { showToast } from '../ui/toastStore';
import { bodyOf, isRatingChanged, type GivenRating } from './given';
import { createPendingRatingStore } from './pendingRatings';

const storage = createMMKV({ id: 'ratings' });
const PENDING_KEY = 'pending';

/** The ratings given offline, kept for the return of the network (Ecrans › E-15, hors connexion). */
export const pendingRatings = createPendingRatingStore({
  get: () => storage.getString(PENDING_KEY),
  set: (value) => storage.set(PENDING_KEY, value),
});

/** Where the rating was given: E-15 at the end of the Go, or later from the past outings. */
export type RatingSource = 'go_end' | 'past';

/** No answer reached the device: the rating is kept for the return of the network. */
const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

/**
 * The cards, sheets and reviews of the routes, and the outings, asked again: the average of the
 * card follows the rating at once (`['routes', …]` holds the search, the sheet and the reviews).
 */
function refresh(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ['routes'] });
  void client.invalidateQueries({
    queryKey: plannedQueryKey(session.store.getState().user?.uid ?? ''),
  });
}

/** Sends one rating: taken, kept for later (no network), or refused for good. */
async function send(client: QueryClient, plannedId: string, body: RateRoute) {
  try {
    await api.rateOuting(plannedId, body);
    refresh(client);
    return 'sent' as const;
  } catch (error) {
    return isUnreachable(error) ? ('kept' as const) : ('refused' as const);
  }
}

/**
 * « Terminer » of E-15 with a rating: `route_rated`, then the rating sent, or kept on the phone
 * offline and sent at the return of the network. Nothing leaves when it did not change.
 */
export function useRateOuting() {
  const { t } = useTranslation();
  const client = useQueryClient();
  return async (outing: PlannedRoute, given: GivenRating | null, source: RatingSource) => {
    if (!given || !isRatingChanged(outing, given)) {
      return;
    }
    const body = bodyOf(given);
    analytics.track('route_rated', {
      route_id: outing.route.id,
      rating: given.rating,
      has_comment: body.comment !== null,
      source,
    });
    const result = onlineManager.isOnline()
      ? await send(client, outing.id, body)
      : ('kept' as const);
    if (result === 'kept') {
      pendingRatings.queue({ plannedId: outing.id, body });
      showToast('info', t('go.end.kept'), { isAboveTabBar: true });
    } else if (result === 'refused') {
      showToast('error', t('go.end.failed'), {
        subtitle: t('go.toast.failedBody'),
        isAboveTabBar: true,
      });
    }
  };
}

/** At the root: the ratings given offline leave at the return of the network. */
export function RatingSync() {
  const client = useQueryClient();
  const isOnline = useIsOnline();
  const pendingCount = useStore(pendingRatings.store, (state) => state.pending.length);
  useEffect(() => {
    if (!isOnline || pendingCount === 0) {
      return;
    }
    void (async () => {
      for (const { plannedId, body } of pendingRatings.pending()) {
        if ((await send(client, plannedId, body)) === 'kept') {
          return;
        }
        pendingRatings.sent(plannedId);
      }
    })();
  }, [client, isOnline, pendingCount]);
  return null;
}

// Signed out: the ratings of the account do not stay on the phone.
session.store.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'anonymous') {
    pendingRatings.clear();
  }
});
