import { straightLineM } from '@widoo/orchestration';
import type { LatLng, PlannedRoute, PlannedRouteStep, TimelineStep } from '@widoo/shared';

/**
 * Where a Go stands (Ecrans › E-07), a pure function of the planning and of what the phone keeps:
 * the step of the moment, the steps done, en route or on site.
 */

/** « Vous semblez être sur place » under this distance from the step (seuil proposé, E-07). */
export const ARRIVAL_SUGGESTION_M = 100;

/**
 * What the phone keeps of a Go until the API takes it: the steps « J'y suis » reached (no route
 * writes `arrived_at` yet, #418), and the steps done offline, sent when the network is back.
 */
export interface GoLocal {
  arrivedStepIds: readonly string[];
  pendingDone: readonly { stepId: string; at: string }[];
}

export const emptyGoLocal: GoLocal = { arrivedStepIds: [], pendingDone: [] };

export type GoStepStatus = 'done' | 'skipped' | 'current' | 'upcoming';

export interface GoStep {
  step: PlannedRouteStep;
  index: number;
  status: GoStepStatus;
  /** When it was done, by the API or offline; null otherwise. */
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
  const progressOf = new Map(planned.steps.map((entry) => [entry.stepId, entry]));
  const timesOf = new Map(planned.timeline.steps.map((entry) => [entry.stepId, entry]));
  const pending = new Map(local.pendingDone.map((entry) => [entry.stepId, entry.at]));
  let isCurrentFound = false;
  const steps = planned.route.steps.map((step, index): GoStep => {
    const progress = progressOf.get(step.id);
    const doneAt = progress?.doneAt ?? pending.get(step.id) ?? null;
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
  const isArrived =
    current !== null &&
    (progressOf.get(current.step.id)?.arrivedAt != null ||
      local.arrivedStepIds.includes(current.step.id));
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
