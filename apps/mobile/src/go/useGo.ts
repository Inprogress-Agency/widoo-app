import { onlineManager, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import { stepMapsUrl } from '@widoo/orchestration';
import type { PlannedRoute } from '@widoo/shared';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { localTime } from '../route/sheetText';
import { haptic } from '../ui/haptics';
import { showToast } from '../ui/toastStore';
import { stepName } from './goText';
import { createGoLocalStore } from './localStore';
import {
  actualMinutes,
  doneRatio,
  emptyGoLocal,
  goProgress,
  type GoProgress,
  type GoStepAction,
} from './progress';
import { startGo } from './startGo';

const storage = createMMKV({ id: 'go' });
const STATE_KEY = 'state';

/** What the phone keeps of the Go under way: the actions of its steps not sent yet. */
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

/** The time of the moment, again every minute: a Go late pushes its times as it goes. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

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
  const now = useMinute();
  const progress = useMemo(
    () => (planned ? goProgress(planned, local, now) : null),
    [planned, local, now],
  );
  return { planned, progress };
}

/**
 * Back on a tab, the Go is read again: one stopped or closed elsewhere (another phone, the night
 * job) closes the mini-player, which `AppState` alone only learns at the return of the app.
 * Offline nothing is asked: the Go kept on the phone goes on.
 */
export function useReadGoOnTabChange(tabIndex: number) {
  const client = useQueryClient();
  const shownIndex = useRef(tabIndex);
  useEffect(() => {
    if (shownIndex.current === tabIndex) {
      return;
    }
    shownIndex.current = tabIndex;
    if (onlineManager.isOnline()) {
      void client.invalidateQueries({ queryKey: goQueryPrefix });
    }
  }, [client, tabIndex]);
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

/** The route of each action of a step (#503): each answers the Go up to date. */
const sendOf: Record<GoStepAction, (id: string, stepId: string) => Promise<PlannedRoute>> = {
  arrived: (id, stepId) => api.markPlannedStepArrived(id, stepId),
  done: (id, stepId) => api.markPlannedStepDone(id, stepId),
  skip: (id, stepId) => api.skipPlannedStep(id, stepId),
  unskip: (id, stepId) => api.unskipPlannedStep(id, stepId),
};

/** Sends the kept actions in their order, until none is left or the network fails again. */
async function drain(client: QueryClient, plannedId: string) {
  for (let sentCount = 0; ; sentCount++) {
    const entry = goLocal.localOf(plannedId).pending[0];
    if (!entry) {
      // A read asked at the return of the network may answer before them: read the Go again.
      if (sentCount > 0) {
        void client.invalidateQueries({ queryKey: goQueryPrefix });
      }
      return;
    }
    try {
      setGo(client, await sendOf[entry.action](plannedId, entry.stepId));
    } catch (error) {
      if (isUnreachable(error)) {
        return;
      }
      // Refused (the Go closed meanwhile, the step done elsewhere): nothing more to send for it.
    }
    goLocal.sent(plannedId, entry);
  }
}

let sending: Promise<void> | null = null;

/** Sends the actions kept offline (E-07, hors connexion), one sending at a time. */
function sendPending(client: QueryClient, plannedId: string): Promise<void> {
  sending ??= drain(client, plannedId).finally(() => {
    sending = null;
  });
  return sending;
}

/** At the root: the actions kept offline leave at the return of the network. */
export function GoSync() {
  const client = useQueryClient();
  const isOnline = useIsOnline();
  const { planned } = useGo();
  const pendingCount = useStore(goLocal.store, (state) => state.local.pending.length);
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
export function useGoActions(
  planned: PlannedRoute,
  progress: GoProgress,
  /** The outing completed, given before the Go leaves the cache: E-15 takes over at once. */
  onCompleted?: (outing: PlannedRoute) => void,
) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const routeId = planned.route.id;
  const current = progress.current;

  const failed = () =>
    showToast('error', t('go.toast.actionFailed'), { subtitle: t('go.toast.failedBody') });

  /**
   * An action of a step: sent at once, or kept on the phone offline and sent at the return of the
   * network, after those kept before it. False when the API refused it.
   */
  const send = async (action: GoStepAction, stepId: string) => {
    const isOnline = onlineManager.isOnline();
    if (isOnline && goLocal.localOf(planned.id).pending.length === 0) {
      try {
        setGo(client, await sendOf[action](planned.id, stepId));
        return true;
      } catch (error) {
        if (!isUnreachable(error)) {
          failed();
          return false;
        }
      }
    }
    goLocal.queue(planned.id, action, stepId, new Date());
    if (isOnline) {
      void sendPending(client, planned.id);
    } else {
      showToast('info', t('go.kept'));
    }
    return true;
  };
  const markDone = (stepId: string) => send('done', stepId);

  const close = async (status: 'completed' | 'stopped') => {
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
      return;
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
    if (status === 'completed') {
      onCompleted?.(closed);
    }
    goLocal.clear();
    setGo(client, null);
    void client.invalidateQueries({
      queryKey: plannedQueryKey(session.store.getState().user?.uid ?? ''),
    });
  };

  return {
    /** « J'y suis »: never by itself, with the pill shown or not (D-029); written by the API. */
    async arrive(isSuggested: boolean) {
      if (!current) {
        return;
      }
      haptic('arrived');
      if (await send('arrived', current.step.id)) {
        analytics.track('go_arrived', {
          route_id: routeId,
          step_index: current.index,
          suggested: isSuggested,
        });
      }
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
    /**
     * « Passer cette étape », without a confirmation: cap on the next step, times recomputed, and
     * the toast « Café Lomi passé » with « Annuler » (D-033). `late` from the step alert.
     */
    async skip(reason: 'late' | 'user') {
      if (!current) {
        return;
      }
      const { step, index } = current;
      if (!(await send('skip', step.id))) {
        return;
      }
      analytics.track('go_step_skipped', { route_id: routeId, step_index: index, reason });
      const uid = session.store.getState().user?.uid ?? '';
      const after = client.getQueryData<PlannedRoute | null>(goQueryKey(uid)) ?? planned;
      const end = goProgress(after, goLocal.localOf(planned.id)).timeline.endsAt;
      showToast('info', t('go.skip.done', { place: stepName(step) }), {
        subtitle: t('go.progress.end', { time: localTime(t, end).short }),
        action: { label: t('go.skip.undo'), onPress: () => void send('unskip', step.id) },
      });
    },
    /**
     * « Itinéraire »: Google Maps to the step, in the mode of the trip to it, by the API; written
     * here offline with the same shared `stepMapsUrl` (E-07, #510).
     */
    async directions() {
      if (!current) {
        return;
      }
      const isLocalAhead = goLocal.localOf(planned.id).pending.length > 0;
      const url =
        onlineManager.isOnline() && !isLocalAhead
          ? await api
              .getPlannedMapsUrl(planned.id)
              .then((answer) => answer.url)
              .catch(() => stepMapsUrl(planned.route.steps, current.index))
          : stepMapsUrl(planned.route.steps, current.index);
      analytics.track('maps_opened', { route_id: routeId, mode: 'next_step' });
      await Linking.openURL(url).catch(failed);
    },
    /** « Terminer la sortie »: the outing completed goes to `onCompleted`, E-15 (D-029). */
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
