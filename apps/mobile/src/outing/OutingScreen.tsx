import { useQueryClient } from '@tanstack/react-query';
import type { PlannedRoute, RouteDetail, RouteDetailStep } from '@widoo/shared';
import { spacing } from '@widoo/tokens';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { useSession } from '../auth';
import { StatusMessage } from '../components/StatusMessage';
import { useIsOnline } from '../discovery/useRouteSearch';
import { useStartGo } from '../go/useGo';
import { plannedQueryKey, usePlanActions } from '../plan/planned';
import { PlanSheet, type PlanSheetMethods } from '../plan/PlanSheet';
import { submitPlan } from '../plan/submitPlan';
import { useRouteSheet } from '../route/useRouteSheet';
import { Button } from '../ui/Button';
import { StickyBar } from '../ui/StickyBar';
import { showToast } from '../ui/toastStore';
import { TopBar } from '../ui/TopBar';
import { cancelOuting, type OutingActionDeps } from './outingActions';
import { OutingBody } from './OutingBody';
import { useOuting, useOutingChecklist } from './useOuting';

interface OutingScreenProps {
  outingId: string;
  onBack: () => void;
  onSeeRoute: (routeId: string) => void;
}

const bookingEvent = (route: RouteDetail, step: RouteDetailStep) => ({
  route_id: route.id,
  provider: step.bookingProvider ?? 'other',
});

/**
 * « Votre sortie » (Ecrans › E-08), pushed from « À venir » without the tab bar (M-03): the outing
 * as planned, « Changer » to E-06 « Modifier la sortie », « Annuler la sortie » after the system
 * alert, and « C'est parti » stuck at its foot, active at any time (D-035).
 */
export function OutingScreen({ outingId, onBack, onSeeRoute }: OutingScreenProps) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const uid = useSession((state) => state.user?.uid ?? '');
  const isOnline = useIsOnline();
  const { outing, isError, retry } = useOuting(outingId);
  const { state } = useRouteSheet(outing?.routeId ?? '');
  const route = outing?.routeId && state.status === 'ready' ? state.route : null;
  const planActions = usePlanActions();
  const startGo = useStartGo();
  const scroll = useRef<ScrollView>(null);
  const planSheet = useRef<PlanSheetMethods>(null);
  const checklist = useOutingChecklist(outing, () =>
    showToast('error', t('routes.outing.toast.checkFailed'), {
      subtitle: t('routes.outing.toast.failedBody'),
      isAboveStickyBar: true,
    }),
  );

  const actionDeps: OutingActionDeps = {
    t,
    update: api.updatePlanned,
    trackCancelled: (properties) => analytics.track('plan_cancelled', properties),
    trackRestored: (properties) => analytics.track('plan_restored', properties),
    toast: showToast,
    onChanged: () => void client.invalidateQueries({ queryKey: plannedQueryKey(uid) }),
    onCancelled: onBack,
    now: () => new Date(),
  };
  const openBooking = (bookedRoute: RouteDetail, step: RouteDetailStep) => {
    if (step.bookingUrl) {
      analytics.track('booking_link_opened', {
        ...bookingEvent(bookedRoute, step),
        step_id: step.id,
        context: 'plan',
      });
      void Linking.openURL(step.bookingUrl);
    }
  };
  const confirmCancel = (current: PlannedRoute) =>
    Alert.alert(t('routes.outing.cancelAlert.title'), t('routes.outing.cancelAlert.body'), [
      {
        text: t('routes.outing.cancelAlert.confirm'),
        style: 'destructive',
        onPress: () => void cancelOuting(current, actionDeps),
      },
      { text: t('routes.outing.cancelAlert.keep'), style: 'cancel' },
    ]);

  const renderBody = () => {
    if (!outing) {
      return isError ? (
        <StatusMessage
          icon="error"
          title={t('routes.outing.error.title')}
          body={t('routes.outing.error.body')}
          action={<Button label={t('routes.outing.error.retry')} onPress={retry} />}
        />
      ) : (
        <StatusMessage title={t('routes.outing.title')} isBusy />
      );
    }
    if (outing.status !== 'planned') {
      return (
        <StatusMessage
          icon="empty-upcoming"
          title={t('routes.outing.gone.title')}
          body={t('routes.outing.gone.body')}
        />
      );
    }
    return (
      <OutingBody
        outing={outing}
        route={route}
        isOnline={isOnline}
        checked={checklist.checked}
        now={new Date()}
        onChange={route ? () => planSheet.current?.open(route, outing) : null}
        onToggle={(step) =>
          void checklist.toggle(step.id).then((isChecked) => {
            if (isChecked && route) {
              analytics.track('plan_checklist_item_done', bookingEvent(route, step));
            }
          })
        }
        onBook={(step) => route && openBooking(route, step)}
        onSeeRoute={outing.routeId ? () => onSeeRoute(outing.route.id) : null}
        onCancel={() => confirmCancel(outing)}
      />
    );
  };

  const goRouteId = outing?.status === 'planned' ? outing.routeId : null;
  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={t('routes.outing.title')}
        back={{ label: t('routes.outing.back'), onPress: onBack }}
      />
      <ScrollView
        ref={scroll}
        contentContainerClassName="p-16"
        contentContainerStyle={{ paddingBottom: spacing['space-32'] }}
      >
        {renderBody()}
      </ScrollView>
      {goRouteId && (
        <StickyBar>
          <Button
            isDense
            isFullWidth
            label={t('routes.upcoming.go')}
            accessibilityLabel={t('routes.upcoming.goSpoken', { title: outing?.route.title })}
            onPress={() => void startGo(goRouteId)}
          />
        </StickyBar>
      )}
      <PlanSheet
        ref={planSheet}
        isOnline={isOnline}
        onSubmit={(choice) =>
          submitPlan(choice, {
            t,
            create: planActions.create,
            update: planActions.update,
            trackPlanned: (properties) => analytics.track('route_planned', properties),
            trackChanged: (properties) => analytics.track('plan_changed', properties),
            toast: showToast,
            // Already on the outing: « Voir » brings its new date to the top.
            onSee: () => scroll.current?.scrollTo({ y: 0 }),
            now: new Date(),
          })
        }
        onToggleBooking={(sheetRoute, step, isChecked) => {
          if (isChecked) {
            analytics.track('plan_checklist_item_done', bookingEvent(sheetRoute, step));
          }
        }}
        onBook={openBooking}
      />
    </View>
  );
}
