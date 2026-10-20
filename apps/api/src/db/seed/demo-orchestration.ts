/**
 * The demo routes as the engine computes them (Orchestration, D-088): their estimated trips in
 * the mode of each step, and `computeRoute` on the dataset date in Paris, with the thresholds and
 * buckets of the wiki. The seed stores this result as the editor would, and the fixtures of the
 * app read the same numbers: nothing of it is entered by hand.
 */
import {
  computeRoute,
  computeTransitions,
  type ComputedRoute,
  type Transition,
} from '@widoo/orchestration';
import type { BudgetBucket, DurationBucket, RouteComputed } from '@widoo/shared';
import { demoDataset, paris, type DemoPlace, type DemoRoute } from './demo-routes';

export interface OrchestratedDemoRoute {
  /** Our estimate of each trip, null after the last step: stored with the steps. */
  transitions: (Transition | null)[];
  result: ComputedRoute;
  computed: RouteComputed;
}

const { datasetDate, places, routes } = demoDataset;
const placeOf = new Map(places.map((place) => [place.key, place]));

/** The places of the steps of a route, in order. */
export function placesOfRoute(route: DemoRoute): DemoPlace[] {
  return route.steps.map((step) => {
    const place = placeOf.get(step.place);
    if (!place) throw new Error(`Unknown place ${step.place}`);
    return place;
  });
}

/** Opening slots of a place as the engine reads them, one per weekday. */
export const hoursOf = (place: DemoPlace) =>
  place.hours.flatMap(({ weekdays, opens, closes }) =>
    weekdays.map((weekday) => ({ weekday, opens, closes, validFrom: null, validTo: null })),
  );

async function orchestrate(route: DemoRoute): Promise<OrchestratedDemoRoute> {
  const stepPlaces = placesOfRoute(route);
  const transitions = await computeTransitions(
    route.steps.map((step, index) => ({
      location: (stepPlaces[index] as DemoPlace).location,
      mode: step.transitionMode ?? null,
    })),
    { directions: null, cache: null },
  );
  const result = computeRoute(
    {
      title: route.title,
      description: route.description,
      hasPhoto: route.photos.length > 0,
      suggestedStart: route.suggestedStart ?? null,
      timeZone: paris.timezone,
      steps: route.steps.map((step, index) => {
        const place = stepPlaces[index] as DemoPlace;
        return {
          id: `${route.key}:${index}`,
          placeId: place.key,
          durationMin: step.durationMin,
          costPerPersonEur: step.costPerPerson,
          bookingRequired: step.bookingRequired,
          transition: transitions[index] ?? null,
          // The seed has no photo of a place: those of the step only.
          hasPhoto: step.photos.length > 0,
          // Every place of the seed is verified on the dataset date.
          place: {
            location: place.location,
            hours: hoursOf(place),
            alwaysOpen: place.alwaysOpen,
            isIndoor: place.isIndoor,
            verificationStatus: 'verified',
            verifiedAt: datasetDate,
          },
        };
      }),
    },
    { now: new Date(datasetDate) },
  );
  if (!result.computed) throw new Error(`Demo route ${route.key} has no step`);
  return { transitions, result, computed: result.computed };
}

const orchestrated = new Map(
  await Promise.all(routes.map(async (route) => [route.key, await orchestrate(route)] as const)),
);

/** What the engine computes of a demo route. */
export function orchestrationOf(route: DemoRoute): OrchestratedDemoRoute {
  const found = orchestrated.get(route.key);
  if (!found) throw new Error(`Unknown demo route ${route.key}`);
  return found;
}

export const bucketsOf = (
  route: DemoRoute,
): { durationBucket: DurationBucket; budgetBucket: BudgetBucket } => {
  const { durationBucket, budgetBucket } = orchestrationOf(route).computed;
  return { durationBucket, budgetBucket };
};
