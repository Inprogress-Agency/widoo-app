/**
 * Aggregates and coherence rules of a route being edited (Orchestration › Agrégats, Règles de
 * cohérence) that need neither the hours nor the places: the rules on hours, verification and
 * order are added to them by `computeRoute`.
 */
import type { CoherenceIssue, CoherenceRuleCode, RouteComputed, Transport } from '@widoo/shared';

/** A step as the rules see it, its trip to the next one estimated (D-088). */
export interface EvaluatedStep {
  placeId: string;
  durationMin: number;
  costPerPersonEur: number | null;
  /** Null for the last step. */
  transition: { distanceM: number; durationMin: number; mode: Transport } | null;
  /** A photo of the step, or of its place (`missing_step_photo`, D-049). */
  hasPhoto: boolean;
}

export interface EvaluatedRoute {
  title: string | null;
  description: string | null;
  /** A photo of the route itself (`missing_photo`). */
  hasPhoto: boolean;
  steps: readonly EvaluatedStep[];
}

/** Thresholds of the rules, kept by the wiki and read from `settings` (`coherenceThresholdsOf`). */
export interface CoherenceThresholds {
  minSteps: number;
  maxSteps: number;
  stepMinDurationMin: number;
  stepMaxDurationMin: number;
  walkTransitionMaxMin: number;
  otherTransitionMaxMin: number;
  totalMaxMin: number;
  /** Share of the total duration spent travelling, above which `too_many_transitions` warns. */
  travelShareMax: number;
  descriptionMinLength: number;
  /** Share by which the order of the steps lengthens the trips, above which `back_and_forth`. */
  backAndForthMax: number;
}

/** 2 and 10 steps, 10 min and 6 h, 30 and 45 min, 14 h, 40 %, 80 characters, 50 %. */
export const defaultCoherenceThresholds: CoherenceThresholds = {
  minSteps: 2,
  maxSteps: 10,
  stepMinDurationMin: 10,
  stepMaxDurationMin: 360,
  walkTransitionMaxMin: 30,
  otherTransitionMaxMin: 45,
  totalMaxMin: 14 * 60,
  travelShareMax: 0.4,
  descriptionMinLength: 80,
  backAndForthMax: 0.5,
};

/** Aggregates of the steps on their estimated trips (D-088), the first fields of `RouteComputed`. */
export type RouteAggregates = Pick<
  RouteComputed,
  'durationMin' | 'budgetPerPersonEur' | 'distanceM' | 'walkingM' | 'effort' | 'computedAt'
>;

/** The aggregates, null without any step, and the rules broken: blocking ones in `errors`. */
export interface BaseEvaluation {
  computed: RouteAggregates | null;
  warnings: CoherenceIssue[];
  errors: CoherenceIssue[];
}

/** Effort: `easy` under 3 km on foot, `moderate` under 7 km, `intense` beyond. */
const EASY_WALK_MAX_M = 3000;
const MODERATE_WALK_MAX_M = 7000;

function computedOf(steps: readonly EvaluatedStep[], now: Date): RouteAggregates | null {
  if (steps.length === 0) {
    return null;
  }
  const trips = steps.flatMap((step) => (step.transition ? [step.transition] : []));
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const walkingM = sum(trips.filter((trip) => trip.mode === 'walk').map((trip) => trip.distanceM));
  return {
    durationMin: sum(steps.map((step) => step.durationMin)) + sum(trips.map((t) => t.durationMin)),
    budgetPerPersonEur: sum(steps.map((step) => step.costPerPersonEur ?? 0)),
    distanceM: sum(trips.map((trip) => trip.distanceM)),
    walkingM,
    effort:
      walkingM < EASY_WALK_MAX_M ? 'easy' : walkingM < MODERATE_WALK_MAX_M ? 'moderate' : 'intense',
    computedAt: now.toISOString(),
  };
}

/** The aggregates of the route, and the rules it breaks: blocking ones in `errors`. */
export function evaluateRoute(
  route: EvaluatedRoute,
  now: Date,
  thresholds: CoherenceThresholds = defaultCoherenceThresholds,
): BaseEvaluation {
  const errors: CoherenceIssue[] = [];
  const warnings: CoherenceIssue[] = [];
  const add = (list: CoherenceIssue[], code: CoherenceRuleCode, stepPosition: number | null) =>
    list.push({ code, stepPosition });
  const { steps } = route;
  const computed = computedOf(steps, now);

  if (!route.title) add(errors, 'missing_title', null);
  if (steps.length < thresholds.minSteps) add(errors, 'min_steps', null);
  if (steps.length > thresholds.maxSteps) add(errors, 'max_steps', null);

  const seenPlaces = new Set<string>();
  steps.forEach((step, position) => {
    if (
      step.durationMin < thresholds.stepMinDurationMin ||
      step.durationMin > thresholds.stepMaxDurationMin
    ) {
      add(errors, 'step_has_duration', position);
    }
    if (step.transition) {
      const max =
        step.transition.mode === 'walk'
          ? thresholds.walkTransitionMaxMin
          : thresholds.otherTransitionMaxMin;
      // A warning beyond the limit, blocking beyond its double.
      if (step.transition.durationMin > 2 * max) add(errors, 'transition_too_long', position);
      else if (step.transition.durationMin > max) add(warnings, 'transition_too_long', position);
    }
    if (seenPlaces.has(step.placeId)) add(warnings, 'duplicate_place', position);
    seenPlaces.add(step.placeId);
    if (!step.hasPhoto) add(errors, 'missing_step_photo', position);
  });

  if (computed) {
    if (computed.durationMin > thresholds.totalMaxMin) add(errors, 'total_too_long', null);
    const travelMin = steps.reduce((total, step) => total + (step.transition?.durationMin ?? 0), 0);
    if (computed.durationMin > 0 && travelMin / computed.durationMin > thresholds.travelShareMax) {
      add(warnings, 'too_many_transitions', null);
    }
  }
  if ((route.description?.length ?? 0) < thresholds.descriptionMinLength) {
    add(errors, 'missing_description', null);
  }
  if (!route.hasPhoto) add(errors, 'missing_photo', null);

  return { computed, warnings, errors };
}
