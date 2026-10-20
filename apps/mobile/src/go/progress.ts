import { straightLineM } from '@widoo/orchestration';
import type {
  LatLng,
  PlannedRoute,
  PlannedRouteStep,
  PlannedStepProgress,
  TimelineStep,
} from '@widoo/shared';

/**
 * Where a Go stands (Ecrans › E-07), a pure function of the planning and of what the phone keeps:
 * the step of the moment, the steps done, en route or on site.
 */

/** « Vous semblez être sur place » under this distance from the step (seuil proposé, E-07). */
export const ARRIVAL_SUGGESTION_M = 100;

/** An action of a step of the Go (E-07): « J'y suis », « Étape suivante », « Passer », « Annuler ». */
export type GoStepAction = 'arrived' | 'done' | 'skip' | 'unskip';

/** An action taken offline, or not yet answered, sent in order once the network is back. */
export interface GoPendingAction {
  action: GoStepAction;
  stepId: string;
  /** When it was taken on the phone. */
  at: string;
}

/** What the phone keeps of a Go until the API takes it: the actions not sent yet, in order. */
export interface GoLocal {
  pending: readonly GoPendingAction[];
}

export const emptyGoLocal: GoLocal = { pending: [] };

type StepState = Omit<PlannedStepProgress, 'stepId'>;

/** The state of a step once an action the API does not know yet is applied, as the API would. */
function applied(state: StepState, { action, at }: GoPendingAction): StepState {
  switch (action) {
    case 'arrived':
      return { ...state, arrivedAt: state.arrivedAt ?? at };
    case 'done':
      return { ...state, doneAt: state.doneAt ?? at, skippedAt: null };
    case 'skip':
      return state.doneAt ? state : { ...state, skippedAt: state.skippedAt ?? at };
    case 'unskip':
      return { ...state, skippedAt: null };
  }
}

export type GoStepStatus = 'done' | 'skipped' | 'current' | 'upcoming';

export interface GoStep {
  step: PlannedRouteStep;
  index: number;
  status: GoStepStatus;
  /** When it was done, by the API or on the phone offline; null otherwise. */
  doneAt: string | null;
  times: TimelineStep | null;
}

export interface GoProgress {
  steps: GoStep[];
  /** The step of the moment: the first neither done nor skipped; null once none is left. */
  current: GoStep | null;
  /** `on_site` after « J'y suis » on the current step, `en_route` before. */
  phase: 'en_route' | 'on_site';
  /** The step after the current one, neither done nor skipped; null on the last one. */
  next: GoStep | null;
  doneCount: number;
  skippedCount: number;
  total: number;
}

/** The progress of `planned`, with what the phone keeps. */
export function goProgress(planned: PlannedRoute, local: GoLocal): GoProgress {
  const progressOf = new Map<string, StepState>(
    planned.steps.map(({ stepId, ...state }) => [stepId, state]),
  );
  for (const pending of local.pending) {
    const state = progressOf.get(pending.stepId);
    if (state) {
      progressOf.set(pending.stepId, applied(state, pending));
    }
  }
  const timesOf = new Map(planned.timeline.steps.map((entry) => [entry.stepId, entry]));
  let isCurrentFound = false;
  const steps = planned.route.steps.map((step, index): GoStep => {
    const progress = progressOf.get(step.id);
    const doneAt = progress?.doneAt ?? null;
    let status: GoStepStatus;
    if (doneAt) {
      status = 'done';
    } else if (progress?.skippedAt) {
      status = 'skipped';
    } else if (isCurrentFound) {
      status = 'upcoming';
    } else {
      status = 'current';
      isCurrentFound = true;
    }
    return { step, index, status, doneAt, times: timesOf.get(step.id) ?? null };
  });
  const current = steps.find((entry) => entry.status === 'current') ?? null;
  const isArrived = current !== null && progressOf.get(current.step.id)?.arrivedAt != null;
  return {
    steps,
    current,
    phase: isArrived ? 'on_site' : 'en_route',
    next: steps.find((entry) => entry.status === 'upcoming') ?? null,
    doneCount: steps.filter((entry) => entry.status === 'done').length,
    skippedCount: steps.filter((entry) => entry.status === 'skipped').length,
    total: steps.length,
  };
}

/** `steps_done_ratio` of `go_stopped` and `go_completed`: the steps done over all, 0 to 1. */
export const doneRatio = (progress: GoProgress) =>
  progress.total === 0 ? 0 : progress.doneCount / progress.total;

/** `duration_actual_min` of `go_completed`: whole minutes from the start of the Go to `now`. */
export const actualMinutes = (planned: PlannedRoute, now: Date) =>
  Math.max(0, Math.round((now.getTime() - new Date(planned.startsAt).getTime()) / 60_000));

/** Meters from the user to the current step; null without a position or a step left. */
export function distanceToCurrent(progress: GoProgress, position: LatLng | null): number | null {
  if (!position || !progress.current) {
    return null;
  }
  return straightLineM(position, progress.current.step.place.location);
}

/** The pill « Vous semblez être sur place »: en route, under 100 m of the step, app open. */
export const isArrivalSuggested = (progress: GoProgress, distanceM: number | null) =>
  progress.phase === 'en_route' && distanceM !== null && distanceM < ARRIVAL_SUGGESTION_M;
