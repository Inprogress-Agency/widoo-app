import { ApiRequestError } from '@widoo/api-client';
import type {
  AnalyticsEventArgs,
  CreatePlannedRoute,
  PlannedRoute,
  RouteDetailStep,
  UpdatePlannedRoute,
} from '@widoo/shared';
import type { TFunction } from 'i18next';
import type { ToastKind, ToastOptions } from '../ui/toastStore';
import { daysBetween, planDayOf, planStartOf } from './calendar';
import { hasConflicts, localTimeline } from './notice';
import type { PlanChoice } from './PlanSheet';
import { plannedSubtitle } from './planText';

export interface SubmitPlanDeps {
  t: TFunction;
  create: (
    body: CreatePlannedRoute,
    checklist: UpdatePlannedRoute['checklist'],
  ) => Promise<PlannedRoute>;
  update: (id: string, update: UpdatePlannedRoute) => Promise<PlannedRoute>;
  trackPlanned: (properties: AnalyticsEventArgs<'route_planned'>[0]) => void;
  trackChanged: (properties: AnalyticsEventArgs<'plan_changed'>[0]) => void;
  toast: (kind: ToastKind, title: string, options?: ToastOptions) => void;
  /** « Voir » of the toast: Parcours › À venir, until « Votre sortie » (E-08). */
  onSee: () => void;
  now: Date;
}

/**
 * « Programmer » or « Déplacer » (Ecrans › E-06): the planning sent, its event, then the toast
 * « Sortie programmée » or « Sortie déplacée » with « Voir »; a failure leaves the sheet open with
 * an error toast. True when done.
 */
export async function submitPlan(choice: PlanChoice, deps: SubmitPlanDeps): Promise<boolean> {
  const { t, now } = deps;
  const { route, planned, day, minute, checked, notice } = choice;
  const startsAt = planStartOf(day, minute);
  const bookings = route.steps.filter(
    (step): step is RouteDetailStep => !step.isLocked && step.bookingRequired,
  );
  const checklist = bookings.map((step) => ({ stepId: step.id, isChecked: checked.has(step.id) }));
  const today = planDayOf(now);
  try {
    if (planned) {
      await deps.update(planned.id, {
        startsAt,
        ...(checklist.length > 0 && { checklist }),
      });
      deps.trackChanged({
        route_id: route.id,
        days_moved: daysBetween(planDayOf(planned.startsAt), day),
      });
    } else {
      await deps.create(
        { routeId: route.id, startsAt },
        checklist.filter((item) => item.isChecked),
      );
      // Offline the sheet does not plan: the notice is there unless the programme failed.
      const steps = route.steps.filter((step): step is RouteDetailStep => !step.isLocked);
      deps.trackPlanned({
        route_id: route.id,
        days_ahead: Math.max(0, daysBetween(today, day)),
        has_conflicts: notice ? hasConflicts(notice, localTimeline(steps, day, minute)) : false,
        bookings_count: bookings.length,
        source: 'route',
      });
    }
  } catch (error) {
    const isPremium = error instanceof ApiRequestError && error.code === 'premium_required';
    deps.toast('error', t('plan.toast.failed'), {
      subtitle: isPremium ? t('plan.toast.premium') : t('plan.toast.failedBody'),
    });
    return false;
  }
  deps.toast('success', planned ? t('plan.toast.moved') : t('plan.toast.planned'), {
    subtitle: plannedSubtitle(t, day, minute, today),
    action: { label: t('plan.toast.see'), onPress: deps.onSee },
  });
  return true;
}
