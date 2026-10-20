/**
 * The timeline of a Go under way (Ecrans › E-07, retard, choix d'Ilan): the times of the steps
 * ahead recomputed from what really happened, and the step alert of a step that will be closed
 * on arrival or leave less than half its planned time.
 */
import type { LatLng, PlaceHours, RouteTimeline, TimelineStep, Transport } from '@widoo/shared';
import { conflictsOf, openUntil } from './timeline';
import { estimateTrip, type Transition } from './transitions';

const MINUTE_MS = 60_000;

/** A step of the Go as its timeline sees it: the planned stay, and where the user is with it. */
export interface GoTimelineStep {
  id: string;
  durationMin: number;
  location: LatLng;
  /** The planned trip to the next step, in its mode; null for the last one. */
  transition: { durationMin: number; mode: Transport } | null;
  hours: readonly PlaceHours[];
  alwaysOpen?: boolean;
  arrivedAt: Date | null;
  doneAt: Date | null;
  skippedAt: Date | null;
}

/** The trip that replaces the planned ones around skipped steps, from the step it leaves. */
export interface GoDirectTrip {
  fromStepId: string;
  transition: Transition;
}

/**
 * The timeline of the Go: one entry per step not skipped, in step order, and the direct trips
 * across the skipped ones. `endsAt` is « Fin vers ».
 */
export interface GoTimeline extends RouteTimeline {
  directTrips: GoDirectTrip[];
}

const later = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const earlier = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);
const plus = (instant: Date, minutes: number) => new Date(instant.getTime() + minutes * MINUTE_MS);

/**
 * The timeline of a Go at `now`. A step done keeps its planned times, its « Fait à » telling the
 * real one, and the next step leaves from its real end. The step of the moment is not reached
 * before `now`, nor left before `now` once arrived: being late pushes all the steps ahead. A
 * skipped step has no time; the trip goes straight from the step before it to the one after, by
 * our estimate in the mode of the trip that left it.
 */
export function goTimeline(
  steps: readonly GoTimelineStep[],
  planned: RouteTimeline,
  now: Date,
  timeZone: string,
): GoTimeline {
  const plannedOf = new Map(planned.steps.map((entry) => [entry.stepId, entry]));
  const startsAt = new Date(planned.startsAt);
  const entries: TimelineStep[] = [];
  const directTrips: GoDirectTrip[] = [];
  let previous: { step: GoTimelineStep; index: number; leftAt: Date } | null = null;
  let isCurrentFound = false;
  for (const [index, step] of steps.entries()) {
    if (step.skippedAt && !step.doneAt) {
      continue;
    }
    let tripMin = 0;
    if (previous && previous.index === index - 1) {
      tripMin = previous.step.transition?.durationMin ?? 0;
    } else if (previous) {
      const mode = previous.step.transition?.mode ?? 'walk';
      const transition = estimateTrip(previous.step.location, step.location, mode);
      directTrips.push({ fromStepId: previous.step.id, transition });
      tripMin = transition.durationMin;
    }
    const expected = previous ? plus(previous.leftAt, tripMin) : startsAt;
    const plannedEntry = plannedOf.get(step.id);
    if (step.doneAt) {
      const arrivesAt = earlier(step.arrivedAt ?? expected, step.doneAt);
      entries.push({
        stepId: step.id,
        arrivesAt: plannedEntry?.arrivesAt ?? arrivesAt.toISOString(),
        leavesAt: plannedEntry?.leavesAt ?? step.doneAt.toISOString(),
        conflicts: [],
      });
      previous = { step, index, leftAt: step.doneAt };
      continue;
    }
    const isCurrent = !isCurrentFound;
    isCurrentFound = true;
    const arrival = step.arrivedAt ?? (isCurrent ? later(expected, now) : expected);
    const stay = plus(arrival, step.durationMin);
    const departure = isCurrent && step.arrivedAt ? later(stay, now) : stay;
    entries.push({
      stepId: step.id,
      arrivesAt: arrival.toISOString(),
      leavesAt: departure.toISOString(),
      conflicts: step.alwaysOpen ? [] : conflictsOf(step.hours, arrival, departure, timeZone),
    });
    previous = { step, index, leftAt: departure };
  }
  return {
    startsAt: planned.startsAt,
    endsAt: previous?.leftAt.toISOString() ?? planned.startsAt,
    steps: entries,
    directTrips,
  };
}

/**
 * The step alert of the late (Ecrans › E-07): the step will be closed on arrival, or leave less
 * than half of its planned time before it closes. Never for a place open at any hour or whose
 * hours are unknown.
 */
export type GoStepAlert =
  | { kind: 'closed'; arrivesAt: string }
  | { kind: 'closing'; arrivesAt: string; closesAt: string; remainingMin: number };

export function stepAlertOf(
  step: Pick<GoTimelineStep, 'durationMin' | 'hours' | 'alwaysOpen'>,
  entry: Pick<TimelineStep, 'arrivesAt'>,
  timeZone: string,
): GoStepAlert | null {
  if (step.alwaysOpen || step.hours.length === 0) {
    return null;
  }
  const arrival = new Date(entry.arrivesAt);
  const closesAt = openUntil(step.hours, arrival, timeZone);
  if (!closesAt) {
    return { kind: 'closed', arrivesAt: entry.arrivesAt };
  }
  const remainingMin = Math.floor((closesAt.getTime() - arrival.getTime()) / MINUTE_MS);
  return remainingMin < step.durationMin / 2
    ? {
        kind: 'closing',
        arrivesAt: entry.arrivesAt,
        closesAt: closesAt.toISOString(),
        remainingMin,
      }
    : null;
}
