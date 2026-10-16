import { onlineManager, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { PlannedRoute } from '@widoo/shared';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { useStore } from 'zustand';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { goQueryPrefix, OFFLINE_MAX_AGE_MS } from '../api/search-cache';
import { session, useSession } from '../auth';
import { useIsOnline } from '../discovery/useRouteSearch';
import { plannedQueryKey, usePlannedLookup } from '../plan/planned';
import { haptic } from '../ui/haptics';
import { showToast } from '../ui/toastStore';
import { createGoLocalStore } from './localStore';
import {
  actualMinutes,
  doneRatio,
  emptyGoLocal,
  goProgress,
  walkingMapsUrl,
  type GoProgress,
} from './progress';
import { startGo } from './startGo';

const storage = createMMKV({ id: 'go' });
const STATE_KEY = 'state';

/** What the phone keeps of the Go under way: « J'y suis » and the steps done offline. */
export const goLocal = createGoLocalStore({
  get: () => storage.getString(STATE_KEY),
  set: (value) => storage.set(STATE_KEY, value),
});

/** The Go in progress of `uid`, kept on the phone for the outing offline (E-07, D-033). */
export const goQueryKey = (uid: string) => [...goQueryPrefix, uid] as const;

const fetchGo = ({ signal }: { signal?: AbortSignal }) =>
  api
    .listPlanned({ status: 'in_progress', limit: 1 }, signal)
    .then((list) => list.items[0] ?? null);

/** No answer reached the device: the action is kept for the return of the network. */
const isUnreachable = (error: unknown) =>
  error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');

const setGo = (client: QueryClient, planned: PlannedRoute | null) => {
  const uid = session.store.getState().user?.uid;
  if (uid) {
    client.setQueryData(goQueryKey(uid), planned);
  }
};

/** The Go in progress of the account and where it stands; null signed out or without one. */
export function useGo(): { planned: PlannedRoute | null; progress: GoProgress | null } {
  const uid = useSession((state) => state.user?.uid ?? null);
  const { data } = useQuery({
    queryKey: goQueryKey(uid ?? ''),
    queryFn: fetchGo,
    enabled: uid !== null,
    gcTime: OFFLINE_MAX_AGE_MS,
  });
  const planned = uid ? (data ?? null) : null;
  const local = useStore(goLocal.store, (state) =>
    planned && state.plannedId === planned.id ? state.local : emptyGoLocal,
  );
  const progress = useMemo(() => (planned ? goProgress(planned, local) : null), [planned, local]);
  return { planned, progress };
}

const confirmReplace = (t: TFunction) => (title: string) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(t('go.another.title'), t('go.another.body', { title }), [
      { text: t('go.another.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: t('go.another.confirm'), style: 'destructive', onPress: () => resolve(true) },
    ]);
  });

/**
 * « C'est parti » of the route sheet (E-05), once signed in: the Go starts, or reopens, and E-07
 * rises over the tabs. A failure leaves the sheet with an error toast.
 */
export function useStartGo() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const lookupPlanned = usePlannedLookup();
  return async (routeId: string) => {
    const uid = session.store.getState().user?.uid;
    if (!uid) {
      return;
    }
    try {
      const go = await startGo(routeId, {
        current: () => client.fetchQuery({ queryKey: goQueryKey(uid), queryFn: fetchGo }),
        plannedOf: async (id) => {
          const planned = await lookupPlanned(id);
          return planned?.status === 'planned' ? planned : null;
        },
        create: api.createPlanned,
        update: api.updatePlanned,
        confirmReplace: confirmReplace(t),
        trackStarted: (properties) => analytics.track('go_started', properties),
        trackStopped: (properties) => analytics.track('go_stopped', properties),
        now: () => new Date(),
      });
      if (!go) {
        return;
      }
      setGo(client, go);
      void client.invalidateQueries({ queryKey: plannedQueryKey(uid) });
      router.push('/go');
    } catch (error) {
      const isPremium = error instanceof ApiRequestError && error.code === 'premium_required';
      showToast('error', t('go.toast.startFailed'), {
        subtitle: isPremium ? t('go.toast.premium') : t('go.toast.failedBody'),
        isAboveStickyBar: true,
      });
    }
  };
}

/** Sends the steps done offline once the network is back (E-07, hors connexion). */
async function sendPending(client: QueryClient, plannedId: string) {
  for (const { stepId } of goLocal.localOf(plannedId).pendingDone) {
    try {
      setGo(client, await api.markPlannedStepDone(plannedId, stepId));
    } catch (error) {
      if (isUnreachable(error)) {
        return;
      }
      // Refused (the Go closed meanwhile): nothing more to send for this step.
    }
    goLocal.sent(plannedId, stepId);
  }
}

/** At the root: the steps done offline leave at the return of the network. */
export function GoSync() {
  const client = useQueryClient();
  const isOnline = useIsOnline();
  const { planned } = useGo();
  const pendingCount = useStore(goLocal.store, (state) => state.local.pendingDone.length);
  useEffect(() => {
    if (isOnline && planned && pendingCount > 0) {
      void sendPending(client, planned.id);
    }
  }, [client, isOnline, planned, pendingCount]);
  return null;
}

/**
 * The commands of E-07 on the Go `planned`: « J'y suis », « Étape suivante », « Itinéraire »,
 * « Terminer la sortie » and « Arrêter le parcours », with their events. Once the Go is over, it
 * leaves the cache: the mini-player closes, and E-07 too, or gives way to E-15 once completed.
 */
export function useGoActions(planned: PlannedRoute, progress: GoProgress) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const routeId = planned.route.id;
  const current = progress.current;

  const failed = () =>
    showToast('error', t('go.toast.actionFailed'), { subtitle: t('go.toast.failedBody') });

  /** The current step done: sent, or kept on the phone offline. */
  const markDone = async (stepId: string) => {
    if (onlineManager.isOnline()) {
      try {
        setGo(client, await api.markPlannedStepDone(planned.id, stepId));
        return true;
      } catch (error) {
        if (!isUnreachable(error)) {
          failed();
          return false;
        }
      }
    }
    goLocal.queueDone(planned.id, stepId, new Date());
    showToast('info', t('go.kept'));
    return true;
  };

  /** Closes the Go; the outing as closed, for E-15, or null when the API refused it. */
  const close = async (status: 'completed' | 'stopped'): Promise<PlannedRoute | null> => {
    if (current && progress.phase === 'on_site' && status === 'completed') {
      await markDone(current.step.id);
    }
    let closed: PlannedRoute;
    try {
      await sendPending(client, planned.id);
      closed = await api.updatePlanned(planned.id, { status });
    } catch (error) {
      if (isUnreachable(error)) {
        showToast('error', t('go.toast.actionFailed'), { subtitle: t('go.toast.needsNetwork') });
      } else {
        failed();
      }
      return null;
    }
    const after = goProgress(planned, goLocal.localOf(planned.id));
    const ratio = Math.max(doneRatio(after), doneRatio(progress));
    if (status === 'completed') {
      analytics.track('go_completed', {
        route_id: routeId,
        duration_actual_min: actualMinutes(planned, new Date()),
        steps_done_ratio: ratio,
        closed_by: 'user',
      });
    } else {
      analytics.track('go_stopped', { route_id: routeId, steps_done_ratio: ratio });
    }
    goLocal.clear();
    setGo(client, null);
    void client.invalidateQueries({
      queryKey: plannedQueryKey(session.store.getState().user?.uid ?? ''),
    });
    return closed;
  };

  return {
    /** « J'y suis »: never by itself, with the pill shown or not (D-029). */
    arrive(isSuggested: boolean) {
      if (!current) {
        return;
      }
      goLocal.arrive(planned.id, current.step.id);
      haptic('arrived');
      analytics.track('go_arrived', {
        route_id: routeId,
        step_index: current.index,
        suggested: isSuggested,
      });
    },
    /** « Étape suivante »: the step of the moment done, cap on the next one. */
    async next() {
      if (!current) {
        return;
      }
      if (await markDone(current.step.id)) {
        analytics.track('go_step_done', { route_id: routeId, step_index: current.index });
      }
    },
    /** « Itinéraire »: Google Maps on foot to the step, by the API; written here offline. */
    async directions() {
      if (!current) {
        return;
      }
      const isLocalAhead = goLocal.localOf(planned.id).pendingDone.length > 0;
      const url =
        onlineManager.isOnline() && !isLocalAhead
          ? await api
              .getPlannedMapsUrl(planned.id)
              .then((answer) => answer.url)
              .catch(() => walkingMapsUrl(current.step.place.location))
          : walkingMapsUrl(current.step.place.location);
      analytics.track('maps_opened', { route_id: routeId, mode: 'next_step' });
      await Linking.openURL(url).catch(failed);
    },
    /** « Terminer la sortie »: the outing completed, which E-15 then closes (D-029). */
    finish: () => close('completed'),
    /** « Arrêter le parcours », after the system alert; no note (D-029). */
    stop() {
      Alert.alert(t('go.stop.title'), t('go.stop.body'), [
        { text: t('go.stop.continue'), style: 'cancel' },
        { text: t('go.stop.confirm'), style: 'destructive', onPress: () => void close('stopped') },
      ]);
    },
  };
}

// Signed out: nothing of the Go of the account stays on the phone.
session.store.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'anonymous') {
    queryClient.removeQueries({ queryKey: goQueryPrefix });
    goLocal.clear();
  }
});
