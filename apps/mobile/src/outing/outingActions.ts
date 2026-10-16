import type { AnalyticsEventArgs, PlannedRoute, UpdatePlannedRoute } from '@widoo/shared';
import type { TFunction } from 'i18next';
import type { ToastKind, ToastOptions } from '../ui/toastStore';
import { daysAhead } from './outingText';

export interface OutingActionDeps {
  t: TFunction;
  update: (id: string, update: UpdatePlannedRoute) => Promise<PlannedRoute>;
  trackCancelled: (properties: AnalyticsEventArgs<'plan_cancelled'>[0]) => void;
  trackRestored: (properties: AnalyticsEventArgs<'plan_restored'>[0]) => void;
  toast: (kind: ToastKind, title: string, options?: ToastOptions) => void;
  /** The lists of E-08 and the outing ask again. */
  onChanged: () => void;
  /** The outing is cancelled: the page closes before the lists change under it. */
  onCancelled: () => void;
  now: () => Date;
}

const eventOf = (outing: PlannedRoute, now: Date) => ({
  // A route deleted since keeps its snapshot, and the id it had.
  route_id: outing.routeId ?? outing.route.id,
  days_ahead: daysAhead(outing, now),
});

const failedOptions = (t: TFunction): ToastOptions => ({
  subtitle: t('routes.outing.toast.failedBody'),
  isAboveTabBar: true,
});

/**
 * « Rétablir » of the toast « Sortie annulée » (D-038): the outing back to `planned`, at its date;
 * a failure says so. True when done.
 */
export async function restoreOuting(outing: PlannedRoute, deps: OutingActionDeps) {
  const { t } = deps;
  try {
    await deps.update(outing.id, { status: 'planned' });
  } catch {
    deps.toast('error', t('routes.outing.toast.restoreFailed'), failedOptions(t));
    return false;
  }
  deps.onChanged();
  deps.trackRestored(eventOf(outing, deps.now()));
  deps.toast('success', t('routes.outing.toast.restored'), {
    subtitle: outing.route.title,
    isAboveTabBar: true,
  });
  return true;
}

/**
 * « Annuler la sortie », once the system alert confirmed (Ecrans › E-08, D-038): the outing
 * cancelled, its event, then the toast « Sortie annulée » with « Rétablir ». True when done: the
 * page then closes, the outing gone from « À venir ».
 */
export async function cancelOuting(outing: PlannedRoute, deps: OutingActionDeps) {
  const { t } = deps;
  try {
    await deps.update(outing.id, { status: 'cancelled' });
  } catch {
    deps.toast('error', t('routes.outing.toast.cancelFailed'), failedOptions(t));
    return false;
  }
  deps.onCancelled();
  deps.onChanged();
  deps.trackCancelled(eventOf(outing, deps.now()));
  deps.toast('success', t('routes.outing.toast.cancelled'), {
    subtitle: outing.route.title,
    action: {
      label: t('routes.outing.toast.restore'),
      onPress: () => void restoreOuting(outing, deps),
    },
    isAboveTabBar: true,
  });
  return true;
}
