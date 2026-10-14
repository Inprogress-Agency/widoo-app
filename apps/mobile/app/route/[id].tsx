import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Linking, Share } from 'react-native';
import { analytics } from '../../src/analytics';
import { openCreatorProfile } from '../../src/creator/navigation';
import { signInFlow } from '../../src/auth/signIn';
import { discoveryStore, useDiscovery, useIsOnline } from '../../src/discovery/useRouteSearch';
import { usePlannedLookup, usePlannedRoute, usePlanActions } from '../../src/plan/planned';
import { PlanSheet, type PlanSheetMethods } from '../../src/plan/PlanSheet';
import { plannedDateText } from '../../src/plan/planText';
import { submitPlan } from '../../src/plan/submitPlan';
import { showToast } from '../../src/ui/toastStore';
import { googleMapsUrl } from '../../src/route/maps';
import { RouteSheet } from '../../src/route/RouteSheet';
import { routeShareUrl } from '../../src/route/share';
import { useRouteSheet } from '../../src/route/useRouteSheet';
import { useTranslation } from 'react-i18next';

/**
 * E-05, the route sheet: opened from a card, a marker or « Voir plus » of the map, at a step when
 * the tooltip points at one (`step`, from 1); `token` for a private route opened by its link.
 */
export default function RouteScreen() {
  const { t } = useTranslation();
  const { id, step, token } = useLocalSearchParams<{ id: string; step?: string; token?: string }>();
  const { state, retry } = useRouteSheet(id, token);
  const isOnline = useIsOnline();
  const planned = usePlannedRoute(id);
  const planActions = usePlanActions();
  const lookupPlanned = usePlannedLookup();
  const planSheet = useRef<PlanSheetMethods>(null);
  const isOnMap = useDiscovery(
    (discovery) => discovery.results?.items.some((route) => route.id === id) ?? false,
  );

  const goHome = () => {
    router.dismissTo('/');
  };

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
        // the launch resumes after the sign-in. Google Maps until the route under way (E-07).
        onGo={(route) =>
          void signInFlow.requireAccount('go', () => {
            const url = googleMapsUrl(
              route.steps.flatMap((routeStep) =>
                'place' in routeStep
                  ? [routeStep.place.location]
                  : 'location' in routeStep
                    ? [routeStep.location]
                    : [],
              ),
              route.transport,
            );
            if (url) {
              void Linking.openURL(url);
            }
          })
        }
        // Back to the home with the route selected, framed with its steps (E-04).
        onSeeOnMap={
          isOnMap
            ? () => {
                discoveryStore.getState().select(id);
                goHome();
              }
            : null
        }
        onNearby={goHome}
        onOpenCreator={(author) => openCreatorProfile(author, 'route')}
        onScrollDepth={(depth) => analytics.track('route_scrolled', { route_id: id, depth })}
        // Planning asks for an account (D-038): signed out, the sheet E-10 first, then E-06. A
        // planned route opens « Modifier la sortie » until « Votre sortie » exists (E-08).
        onPlan={(route) =>
          void signInFlow.requireAccount('plan', () => {
            void lookupPlanned(route.id).then((current) => planSheet.current?.open(route, current));
          })
        }
        plannedDate={planned ? plannedDateText(t, planned.startsAt, new Date()) : null}
      />
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
            // Out of the route sheet first, to the Parcours tab under it.
            onSee: () => {
              router.dismissAll();
              router.navigate('/routes');
            },
            now: new Date(),
          })
        }
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
