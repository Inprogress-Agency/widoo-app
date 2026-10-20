/**
 * Timeline of a route for a start (Orchestration › Timeline): the arrival and departure of each
 * step, and its conflicts with the opening hours of its place, read in the local time of the city.
 */
import type { PlaceHours, RouteTimeline, TimelineConflict } from '@widoo/shared';

/** A step as the timeline sees it. */
export interface TimelineStepInput {
  id: string;
  durationMin: number;
  /** Minutes of the trip to the next step; null for the last one. */
  transitionMin: number | null;
  /** Opening slots of its place; none at all: hours unknown. */
  hours: readonly PlaceHours[];
  /** « Accessible à toute heure » (`places.always_open`): never a conflict (D-049). */
  alwaysOpen?: boolean;
}

const MINUTE_MS = 60_000;
const DAY_MIN = 24 * 60;
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Local date, weekday (0 = Monday) and minute of the day of an instant in a time zone. */
export interface LocalTime {
  date: string;
  weekday: number;
  minute: number;
}

export function localTimeOf(instant: Date, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    weekday: weekdays.indexOf(part('weekday')),
    minute: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

/** The day before an ISO date, as an ISO date. */
function previousDate(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/** Minutes since midnight of an `HH:MM[:SS]` time; seconds are ignored. */
const minuteOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const isValidOn = (slot: PlaceHours, date: string) =>
  (slot.validFrom === null || slot.validFrom <= date) &&
  (slot.validTo === null || date <= slot.validTo);

interface Interval {
  start: number;
  end: number;
}

/** A slot as minutes of its own day; `closes` at or before `opens` runs past midnight. */
function intervalOf(slot: PlaceHours): Interval {
  const start = minuteOf(slot.opens);
  const end = minuteOf(slot.closes);
  return { start, end: end <= start ? end + DAY_MIN : end };
}

/** Open intervals of a local day, in its minutes: its slots and the night of the day before. */
function openIntervalsOf(hours: readonly PlaceHours[], local: LocalTime) {
  const yesterday = previousDate(local.date);
  const yesterdayWeekday = (local.weekday + 6) % 7;
  const today = hours
    .filter((slot) => slot.weekday === local.weekday && isValidOn(slot, local.date))
    .map(intervalOf);
  const lastNight = hours
    .filter((slot) => slot.weekday === yesterdayWeekday && isValidOn(slot, yesterday))
    .map(intervalOf)
    .filter((interval) => interval.end > DAY_MIN)
    .map(({ start, end }) => ({ start: start - DAY_MIN, end: end - DAY_MIN }));
  const sorted = [...lastNight, ...today].sort((a, b) => a.start - b.start);
  // Touching slots (10:00–12:00, 12:00–14:00) are one opening.
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return { hasSlotToday: today.length > 0, intervals: merged };
}

/** Conflicts of a stay from `arrival` to `departure` with the hours of its place. */
export function conflictsOf(
  hours: readonly PlaceHours[],
  arrival: Date,
  departure: Date,
  timeZone: string,
): TimelineConflict[] {
  if (hours.length === 0) {
    return ['hours_unknown'];
  }
  const local = localTimeOf(arrival, timeZone);
  const { hasSlotToday, intervals } = openIntervalsOf(hours, local);
  const open = intervals.find(({ start, end }) => start <= local.minute && local.minute < end);
  if (!open) {
    return [hasSlotToday ? 'closed_at_arrival' : 'closed_that_day'];
  }
  const leavesAt = local.minute + (departure.getTime() - arrival.getTime()) / MINUTE_MS;
  return leavesAt > open.end ? ['closes_during_step'] : [];
}

/**
 * When the opening that holds `instant` ends, read in `timeZone`: the closing time a step faces on
 * arrival. Null when the place is closed then, or its hours are unknown.
 */
export function openUntil(
  hours: readonly PlaceHours[],
  instant: Date,
  timeZone: string,
): Date | null {
  if (hours.length === 0) {
    return null;
  }
  const minuteStart = Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;
  const local = localTimeOf(instant, timeZone);
  const open = openIntervalsOf(hours, local).intervals.find(
    ({ start, end }) => start <= local.minute && local.minute < end,
  );
  return open ? new Date(minuteStart + (open.end - local.minute) * MINUTE_MS) : null;
}

/**
 * Timeline for `startsAt`: each step arrives when the previous one is left and its trip done.
 * The conflicts are read in `timeZone`, the IANA zone of the city.
 */
export function computeTimeline(
  steps: readonly TimelineStepInput[],
  startsAt: Date,
  timeZone: string,
): RouteTimeline {
  let arrival = startsAt;
  const entries = steps.map((step) => {
    const departure = new Date(arrival.getTime() + step.durationMin * MINUTE_MS);
    const entry = {
      stepId: step.id,
      arrivesAt: arrival.toISOString(),
      leavesAt: departure.toISOString(),
      conflicts: step.alwaysOpen ? [] : conflictsOf(step.hours, arrival, departure, timeZone),
    };
    arrival = new Date(departure.getTime() + (step.transitionMin ?? 0) * MINUTE_MS);
    return entry;
  });
  return {
    startsAt: startsAt.toISOString(),
    endsAt: entries.at(-1)?.leavesAt ?? startsAt.toISOString(),
    steps: entries,
  };
}
