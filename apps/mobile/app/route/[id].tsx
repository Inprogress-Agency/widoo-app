import { zoneSearchBox, type LatLng, type RouteDetail } from '@widoo/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Linking, Share, useWindowDimensions } from 'react-native';
import { analytics } from '../../src/analytics';
import { openCreatorProfile } from '../../src/creator/navigation';
import { signInFlow } from '../../src/auth/signIn';
import { useStartGo } from '../../src/go/useGo';
import { discoveryStore, useDiscovery, useIsOnline } from '../../src/discovery/useRouteSearch';
import { zoomForBbox } from '../../src/map/geo';
import { usePlannedLookup, usePlannedRoute, usePlanActions } from '../../src/plan/planned';
import { PlanSheet, type PlanSheetMethods } from '../../src/plan/PlanSheet';
import { plannedDateText } from '../../src/plan/planText';
import { submitPlan } from '../../src/plan/submitPlan';
import { showToast } from '../../src/ui/toastStore';
import { RouteSheet } from '../../src/route/RouteSheet';
import { routeShareUrl } from '../../src/route/share';
import { useRouteSheet } from '../../src/route/useRouteSheet';
import { useTranslation } from 'react-i18next';

/** « Votre sortie » of a planning (E-08), pushed over the sheet (M-03). */
const openOuting = (id: string) => router.push({ pathname: '/outing/[id]', params: { id } });

/**
 * E-05, the route sheet: opened from a card, a marker or « Voir plus » of the map, at a step when
 * the tooltip points at one (`step`, from 1); `token` for a private route opened by its link;
 * `reschedule`, an outing not done of Parcours › Passés, which opens E-06 at once (D-038).
 */
export default function RouteScreen() {
  const { t } = useTranslation();
  const { id, step, token, reschedule } = useLocalSearchParams<{
    id: string;
    step?: string;
    token?: string;
    reschedule?: string;
  }>();
  const { state, retry } = useRouteSheet(id, token);
  const isOnline = useIsOnline();
  const planned = usePlannedRoute(id);
  const planActions = usePlanActions();
  const lookupPlanned = usePlannedLookup();
  const planSheet = useRef<PlanSheetMethods>(null);
  const startGo = useStartGo();
  const isOnMap = useDiscovery(
    (discovery) => discovery.results?.items.some((route) => route.id === id) ?? false,
  );

  const { width } = useWindowDimensions();
  const goHome = () => {
    router.dismissTo('/');
  };
  // « Voir des parcours proches » of a withdrawn route: the home centred on the 3 km around the
  // zone of its start, as a zone chosen in the search (D-093).
  const showNear = (near: LatLng) => {
    const bbox = zoneSearchBox(near, null);
    discoveryStore.getState().showNear({ bbox, zoom: zoomForBbox(bbox, width) });
    goHome();
  };
  // Planning asks for an account (D-038): signed out, the sheet E-10 first, then E-06. A planned
  // route opens « Votre sortie » (E-08).
  const plan = (route: RouteDetail) =>
    void signInFlow.requireAccount('plan', () => {
      void lookupPlanned(route.id).then((current) =>
        current ? openOuting(current.id) : planSheet.current?.open(route, null),
      );
    });
  // « Reprogrammer » brings the outing not done back until it is planned again (Ecrans › E-08).
  const [rescheduledId, setRescheduledId] = useState(reschedule ?? null);
  const readyRoute = state.status === 'ready' ? state.route : null;
  const hasOpenedReschedule = useRef(false);
  const openReschedule = useEffectEvent((route: RouteDetail) => {
    if (rescheduledId && !hasOpenedReschedule.current) {
      hasOpenedReschedule.current = true;
      plan(route);
    }
  });
  useEffect(() => {
    if (readyRoute) {
      openReschedule(readyRoute);
    }
  }, [readyRoute]);

  return (
    <>
      <RouteSheet
        state={state}
        initialStep={step ? Number(step) - 1 : undefined}
        onRetry={retry}
        onClose={() => router.back()}
        onShare={(route) => {
          const url = routeShareUrl(route.id);
          void Share.share({
            message: t('route.shareMessage', { title: route.title, url }),
            url,
          }).then((result) => {
            if (result.action === Share.sharedAction) {
              analytics.track('route_shared', { route_id: route.id });
            }
          });
        }}
        // Launching a route asks for an account (D-029): signed out, the sheet E-10 opens and
        // the launch resumes after the sign-in; then E-07 rises (Ecrans › E-07, ouverture).
        onGo={(route) => void signInFlow.requireAccount('go', () => void startGo(route.id))}
        // Back to the home with the route selected, framed with its steps (E-04).
        onSeeOnMap={
          isOnMap
            ? () => {
                discoveryStore.getState().select(id);
                goHome();
              }
            : null
        }
        onNearby={showNear}
        onOpenCreator={(author) => openCreatorProfile(author, 'route')}
        onOpenReviews={(id) => router.push({ pathname: '/reviews/[id]', params: { id } })}
        onScrollDepth={(depth) => analytics.track('route_scrolled', { route_id: id, depth })}
        onPlan={plan}
        plannedDate={planned ? plannedDateText(t, planned.startsAt, new Date()) : null}
      />
      <PlanSheet
        ref={planSheet}
        isOnline={isOnline}
        token={token}
        onSubmit={async (choice) => {
          const isDone = await submitPlan(choice, {
            t,
            create: planActions.create,
            update: planActions.update,
            trackPlanned: (properties) => analytics.track('route_planned', properties),
            trackChanged: (properties) => analytics.track('plan_changed', properties),
            toast: showToast,
            onSee: (planned) => openOuting(planned.id),
            rescheduledId,
            now: new Date(),
          });
          if (isDone) {
            setRescheduledId(null);
          }
          return isDone;
        }}
        onToggleBooking={(route, step, isChecked) => {
          if (isChecked) {
            analytics.track('plan_checklist_item_done', {
              route_id: route.id,
              provider: step.bookingProvider ?? 'other',
            });
          }
        }}
        onBook={(route, step) => {
          if (step.bookingUrl) {
            analytics.track('booking_link_opened', {
              route_id: route.id,
              step_id: step.id,
              provider: step.bookingProvider ?? 'other',
              context: 'plan',
            });
            void Linking.openURL(step.bookingUrl);
          }
        }}
      />
    </>
  );
}
