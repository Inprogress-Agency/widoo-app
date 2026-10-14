/**
 * Start of the timeline of a route (Orchestration › Timeline, D-048, D-050): the time the creator
 * chose, else the one closest to 10:00 (14:00 for half a day) where every place is open at
 * arrival, on a local day of the city.
 */
import type { DurationBucket } from '@widoo/shared';
import { computeTimeline, localTimeOf, type TimelineStepInput } from './timeline';

const MINUTE_MS = 60_000;

/** Default start of a day, and of half a day or less (Orchestration › Timeline). */
export const DAY_START = '10:00';
export const HALF_DAY_START = '14:00';
const halfDayBuckets: readonly DurationBucket[] = ['1_2h', 'half_day'];

/**
 * Where the computed start is looked for: every quarter of an hour from 07:00 to 21:00, a
 * window chosen so that no start is proposed in the night.
 */
export const START_SEARCH = { from: '07:00', to: '21:00', stepMin: 15 } as const;

/** Minutes since midnight of an `HH:MM` time. */
export const minuteOfTime = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** `HH:MM` of minutes since midnight. */
export const timeOfMinute = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/** The default start for the duration bucket of the route: 14:00 for half a day or less. */
export function defaultStartOf(bucket: DurationBucket): string {
  return halfDayBuckets.includes(bucket) ? HALF_DAY_START : DAY_START;
}

/** Milliseconds of a local date and minute read as UTC: the wall clock, without its zone. */
const wallClockOf = (date: string, minute: number) =>
  Date.parse(`${date}T00:00:00Z`) + minute * MINUTE_MS;

/** The instant of a local date (`YYYY-MM-DD`) and time (`HH:MM`) in an IANA time zone. */
export function instantAt(date: string, time: string, timeZone: string): Date {
  const wall = wallClockOf(date, minuteOfTime(time));
  // Corrected by the offset of the zone at the guess, then at the instant it gives: the second
  // pass settles a day of daylight saving change.
  let instant = wall;
  for (let pass = 0; pass < 2; pass += 1) {
    const local = localTimeOf(new Date(instant), timeZone);
    instant += wall - wallClockOf(local.date, local.minute);
  }
  return new Date(instant);
}

/** Whether the start lets every step arrive while its place is open: no closed place. */
export function opensEverywhere(
  steps: readonly TimelineStepInput[],
  startsAt: Date,
  timeZone: string,
): boolean {
  return computeTimeline(steps, startsAt, timeZone).steps.every((entry) =>
    entry.conflicts.every(
      (conflict) => conflict !== 'closed_at_arrival' && conflict !== 'closed_that_day',
    ),
  );
}

/**
 * The start on `date` closest to `around` where every place is open at arrival: `around` itself,
 * else a quarter of an hour of `START_SEARCH`, the earlier of two as close. Null when none fits,
 * a place being closed that day or the hours too tight.
 */
export function compatibleStart(
  steps: readonly TimelineStepInput[],
  date: string,
  around: string,
  timeZone: string,
): string | null {
  const target = minuteOfTime(around);
  const candidates: number[] = [];
  for (
    let minute = minuteOfTime(START_SEARCH.from);
    minute <= minuteOfTime(START_SEARCH.to);
    minute += START_SEARCH.stepMin
  ) {
    candidates.push(minute);
  }
  candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
  const found = [target, ...candidates].find((minute) =>
    opensEverywhere(steps, instantAt(date, timeOfMinute(minute), timeZone), timeZone),
  );
  return found === undefined ? null : timeOfMinute(found);
}
