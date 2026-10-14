/**
 * The orchestration of a route (Orchestration): `evaluateRoute` completed by what needs the
 * places and the hours. Buckets, derived filters and transport join the aggregates; the start
 * and its timeline today in the city; the rules `step_has_place` and `unverified_place`.
 */
import {
  budgetBucketOf,
  defaultBucketThresholds,
  durationBucketOf,
  type BucketThresholds,
  type BudgetBucket,
  type CoherenceIssue,
  type DurationBucket,
  type LatLng,
  type PlaceHours,
  type RouteTimeline,
  type Transport,
  type VerificationStatus,
} from '@widoo/shared';
import { derivedConditionsOf, mainTransportOf, type DerivedCondition } from './derived';
import {
  defaultCoherenceThresholds,
  evaluateRoute,
  type CoherenceThresholds,
  type EvaluatedRoute,
  type EvaluatedStep,
  type RouteAggregates,
} from './evaluate';
import { compatibleStart, defaultStartOf, instantAt } from './start';
import { computeTimeline, localTimeOf, type TimelineStepInput } from './timeline';

/** The place of a step as the orchestration sees it. */
export interface RoutePlace {
  location: LatLng;
  hours: readonly PlaceHours[];
  /** « Accessible à toute heure » (`places.always_open`, D-049). */
  alwaysOpen: boolean;
  isIndoor: boolean;
  verificationStatus: VerificationStatus;
  /** Null for a place never verified. */
  verifiedAt: string | null;
}

export interface RouteStep extends EvaluatedStep {
  id: string;
  bookingRequired: boolean;
  /** Null: the step has no geolocated place (`step_has_place`). */
  place: RoutePlace | null;
}

export interface RouteInput extends Omit<EvaluatedRoute, 'steps'> {
  /** `HH:MM` the creator chose (`routes.suggested_start`); null: computed (D-050). */
  suggestedStart: string | null;
  /** IANA zone of the city: the hours are its local times. */
  timeZone: string;
  steps: readonly RouteStep[];
}

export interface ComputeOptions {
  now: Date;
  /** Read from `settings` (`coherenceThresholdsOf`); the wiki's by default. */
  thresholds?: CoherenceThresholds;
  /** Read from `settings` (`bucketThresholdsOf`); the wiki's by default. */
  buckets?: BucketThresholds;
}

/** What `computed` holds: the aggregates and what is derived from the steps. */
export interface ComputedAggregates extends RouteAggregates {
  durationBucket: DurationBucket;
  /** Of the exact sum, never of the displayed rounding (D-032). */
  budgetBucket: BudgetBucket;
  conditions: DerivedCondition[];
  transport: Transport;
  /** `HH:MM` of the start: the creator's, else computed (D-050). */
  startTime: string;
  startComputed: boolean;
}

export interface ComputedRoute {
  /** Null without any step. */
  computed: ComputedAggregates | null;
  warnings: CoherenceIssue[];
  errors: CoherenceIssue[];
  /** Timeline of the start, today in the city; null without any step. */
  timeline: RouteTimeline | null;
}

/** A place never verified, or flagged or closed by the visitors (`unverified_place`). */
export function isUnverifiedPlace(place: Pick<RoutePlace, 'verificationStatus' | 'verifiedAt'>) {
  return (
    place.verifiedAt === null ||
    place.verificationStatus === 'flagged' ||
    place.verificationStatus === 'closed'
  );
}

const timelineStepsOf = (steps: readonly RouteStep[]): TimelineStepInput[] =>
  steps.map((step) => ({
    id: step.id,
    durationMin: step.durationMin,
    transitionMin: step.transition?.durationMin ?? null,
    hours: step.place?.hours ?? [],
    alwaysOpen: step.place?.alwaysOpen ?? false,
  }));

/** The aggregates, the start and its timeline today, and every rule of the wiki with its level. */
export function computeRoute(
  route: RouteInput,
  {
    now,
    thresholds = defaultCoherenceThresholds,
    buckets = defaultBucketThresholds,
  }: ComputeOptions,
): ComputedRoute {
  const base = evaluateRoute(route, now, thresholds);
  const errors = [...base.errors];
  const warnings = [...base.warnings];
  const issue = (code: CoherenceIssue['code'], stepPosition: number | null) => ({
    code,
    stepPosition,
  });
  route.steps.forEach((step, position) => {
    if (!step.place) errors.push(issue('step_has_place', position));
    else if (isUnverifiedPlace(step.place)) warnings.push(issue('unverified_place', position));
  });
  if (!base.computed) {
    return {
      computed: null,
      warnings,
      errors,
      timeline: null,
    };
  }

  const durationBucket = durationBucketOf(base.computed.durationMin, buckets);
  const timelineSteps = timelineStepsOf(route.steps);
  const today = localTimeOf(now, route.timeZone).date;
  const around = route.suggestedStart ?? defaultStartOf(durationBucket);
  const compatible = compatibleStart(timelineSteps, today, around, route.timeZone);
  const startTime = route.suggestedStart ?? compatible ?? around;
  const timeline = computeTimeline(
    timelineSteps,
    instantAt(today, startTime, route.timeZone),
    route.timeZone,
  );
  return {
    computed: {
      ...base.computed,
      durationBucket,
      budgetBucket: budgetBucketOf(base.computed.budgetPerPersonEur, buckets),
      conditions: derivedConditionsOf(
        route.steps.map((step) => ({
          bookingRequired: step.bookingRequired,
          isIndoor: step.place?.isIndoor ?? false,
        })),
      ),
      transport: mainTransportOf(route.steps.map((step) => step.transition)),
      startTime,
      startComputed: route.suggestedStart === null,
    },
    warnings,
    errors,
    timeline,
  };
}
