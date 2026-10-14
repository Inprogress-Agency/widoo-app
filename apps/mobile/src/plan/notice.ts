import { computeTimeline } from '@widoo/orchestration';
import type {
  PlaceHours,
  RouteDetailStep,
  RouteTimeline,
  TimelineConflict,
  TimelineStep,
} from '@widoo/shared';
import {
  addDays,
  clockOf,
  earliestMinuteOf,
  PLAN_TIME_ZONE,
  planDayOf,
  planMinuteOf,
  planStartOf,
  TIME_STEP_MIN,
  weekdayOf,
} from './calendar';

/**
 * What the planning sheet says of the opening of the places (Ecrans › E-06): all open, a place
 * closed at the arrival with a start that avoids it, a place closed that day with the next day
 * when all are open, or a step that ends before the day with the last day possible (D-052). One
 * can plan anyway: a suggestion only sets the time or the day.
 */
export type PlanNotice =
  | { kind: 'open'; endsAt: string; hours: 'allOpen' | 'unknown' | 'closesDuring' }
  | {
      kind: 'closedAtArrival';
      place: string;
      arrival: string;
      hours: SlotTime | null;
      suggestion: number | null;
    }
  | { kind: 'closedThatDay'; place: string; day: string; nextDay: string | null }
  | { kind: 'ended'; place: string; endsOn: string; lastDay: string | null };

/** « il ferme à 18:00 », or « il ouvre à 10:00 » for an arrival before the opening. */
export interface SlotTime {
  relation: 'closes' | 'opens';
  time: string;
}

const blockingConflicts: readonly TimelineConflict[] = ['closed_at_arrival', 'closed_that_day'];
/** How far the suggestions look: two weeks of days, the hours of a day out. */
const SEARCH_DAYS = 14;
const FIRST_SUGGESTED_MIN = 7 * 60;
const LAST_SUGGESTED_MIN = 21 * 60;

/** The timeline of a start computed on the phone, as the API does, to look for a suggestion. */
export function localTimeline(steps: readonly RouteDetailStep[], day: string, minute: number) {
  const input = steps.map((step) => ({
    id: step.id,
    durationMin: step.durationMin,
    transitionMin: step.transition?.durationMin ?? null,
    hours: step.place.hours,
  }));
  return computeTimeline(input, new Date(planStartOf(day, minute)), PLAN_TIME_ZONE);
}

const isBlocked = (entry: TimelineStep) =>
  entry.conflicts.some((conflict) => blockingConflicts.includes(conflict));
const endedBefore = (steps: readonly RouteDetailStep[], day: string) =>
  steps.filter((step) => step.endsOn !== null && step.endsOn < day);

/** No step over and no place closed for this start. */
function isClear(steps: readonly RouteDetailStep[], day: string, minute: number) {
  return (
    endedBefore(steps, day).length === 0 && !localTimeline(steps, day, minute).steps.some(isBlocked)
  );
}

const hhmm = (time: string) => time.slice(0, 5);
const minuteOfTime = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function slotsOn(hours: readonly PlaceHours[], day: string) {
  return hours.filter(
    (slot) =>
      slot.weekday === weekdayOf(day) &&
      (slot.validFrom === null || slot.validFrom <= day) &&
      (slot.validTo === null || day <= slot.validTo),
  );
}

/** The time a place closes before `minute`, or opens after it, on `day`. */
export function slotTimeAt(hours: readonly PlaceHours[], day: string, minute: number) {
  const slots = slotsOn(hours, day);
  const closes = slots.map((slot) => slot.closes).filter((time) => minuteOfTime(time) <= minute);
  if (closes.length > 0) {
    return { relation: 'closes', time: hhmm(closes.sort().at(-1) as string) } as const;
  }
  const opens = slots.map((slot) => slot.opens).filter((time) => minuteOfTime(time) > minute);
  return opens.length > 0
    ? ({ relation: 'opens', time: hhmm(opens.sort()[0] as string) } as const)
    : null;
}

/** The closing of the slot an arrival falls in, for « Ferme à 18:00, pendant l'étape ». */
function closingOfSlot(hours: readonly PlaceHours[], day: string, minute: number) {
  const slot = slotsOn(hours, day).find(
    (candidate) =>
      minuteOfTime(candidate.opens) <= minute && minute < minuteOfTime(candidate.closes),
  );
  return slot ? hhmm(slot.closes) : null;
}

/** The nearest start of the same day, earlier first, with every place open. */
function suggestedStart(steps: readonly RouteDetailStep[], day: string, minute: number, now: Date) {
  const first = Math.max(FIRST_SUGGESTED_MIN, earliestMinuteOf(day, now));
  for (let shift = TIME_STEP_MIN; shift <= 24 * 60; shift += TIME_STEP_MIN) {
    for (const candidate of [minute - shift, minute + shift]) {
      if (candidate >= first && candidate <= LAST_SUGGESTED_MIN && isClear(steps, day, candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * From `from` on, forwards or backwards, the first day when all is open at `minute`; never a day
 * past, nor today at a time gone.
 */
function clearDay(
  steps: readonly RouteDetailStep[],
  from: string,
  direction: 1 | -1,
  minute: number,
  now: Date,
) {
  const today = planDayOf(now);
  for (let offset = 0; offset < SEARCH_DAYS; offset += 1) {
    const day = addDays(from, direction * offset);
    if (day < today) {
      return null;
    }
    if (minute >= earliestMinuteOf(day, now) && isClear(steps, day, minute)) {
      return day;
    }
  }
  return null;
}

export function planNotice(
  steps: readonly RouteDetailStep[],
  timeline: RouteTimeline,
  day: string,
  minute: number,
  now: Date,
): PlanNotice {
  const ended = endedBefore(steps, day);
  const [firstEnded] = ended;
  if (firstEnded?.endsOn) {
    const limit = ended.map((step) => step.endsOn as string).sort()[0] as string;
    return {
      kind: 'ended',
      place: firstEnded.place.name,
      endsOn: firstEnded.endsOn,
      lastDay: clearDay(steps, limit, -1, minute, now),
    };
  }
  const placeOf = (entry: TimelineStep) =>
    steps.find((step) => step.id === entry.stepId)?.place ?? null;
  const closedDay = timeline.steps.find((entry) => entry.conflicts.includes('closed_that_day'));
  if (closedDay) {
    return {
      kind: 'closedThatDay',
      place: placeOf(closedDay)?.name ?? '',
      day,
      nextDay: clearDay(steps, addDays(day, 1), 1, minute, now),
    };
  }
  const closed = timeline.steps.find((entry) => entry.conflicts.includes('closed_at_arrival'));
  if (closed) {
    const place = placeOf(closed);
    const arrival = planMinuteOf(closed.arrivesAt);
    return {
      kind: 'closedAtArrival',
      place: place?.name ?? '',
      arrival: clockOf(arrival),
      hours: place ? slotTimeAt(place.hours, day, arrival) : null,
      suggestion: suggestedStart(steps, day, minute, now),
    };
  }
  return {
    kind: 'open',
    endsAt: timeline.endsAt,
    // A place that closes during its step is marked in the programme; unknown hours to check.
    hours: timeline.steps.some((entry) => entry.conflicts.includes('closes_during_step'))
      ? 'closesDuring'
      : timeline.steps.some((entry) => entry.conflicts.includes('hours_unknown'))
        ? 'unknown'
        : 'allOpen',
  };
}

/** What the programme marks on the line of a step (Ecrans › E-06, le programme). */
export type StepMark =
  | { kind: 'closes' | 'opens' | 'closesDuring'; time: string }
  | { kind: 'closedThatDay' | 'hoursUnknown' };

export function stepMark(step: RouteDetailStep, entry: TimelineStep, day: string): StepMark | null {
  const arrival = planMinuteOf(entry.arrivesAt);
  if (entry.conflicts.includes('closed_that_day')) {
    return { kind: 'closedThatDay' };
  }
  if (entry.conflicts.includes('closed_at_arrival')) {
    const slot = slotTimeAt(step.place.hours, day, arrival);
    return slot ? { kind: slot.relation, time: slot.time } : { kind: 'closedThatDay' };
  }
  if (entry.conflicts.includes('closes_during_step')) {
    const time = closingOfSlot(step.place.hours, day, arrival);
    return time ? { kind: 'closesDuring', time } : null;
  }
  return entry.conflicts.includes('hours_unknown') ? { kind: 'hoursUnknown' } : null;
}

/** `has_conflicts` of `route_planned`: an alert shown, or a place that closes during its step. */
export const hasConflicts = (notice: PlanNotice, timeline: RouteTimeline | null) =>
  notice.kind !== 'open' ||
  (timeline?.steps.some((entry) => entry.conflicts.includes('closes_during_step')) ?? false);
