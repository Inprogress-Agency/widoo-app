/**
 * Calendar days of the planning (Ecrans › E-06), in Paris, the only city: a day is an ISO date
 * (`2026-09-26`), a time the minutes since its midnight, and a start the instant of both with the
 * offset of that day (`2026-09-26T10:00:00+02:00`), as `POST /me/planned` takes it.
 */

export const PLAN_TIME_ZONE = 'Europe/Paris';
/** The time moves by 15 minutes (`mappings.planning.timeStepper`). */
export const TIME_STEP_MIN = 15;
export const LAST_TIME_MIN = 24 * 60 - TIME_STEP_MIN;

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const localParts = new Intl.DateTimeFormat('en-US', {
  timeZone: PLAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partsOf(instant: Date) {
  const parts = localParts.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    minute: (part('hour') % 24) * 60 + part('minute'),
  };
}

const pad = (value: number) => String(value).padStart(2, '0');
const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** The day of an instant in Paris. */
export function planDayOf(instant: Date | string): string {
  const { year, month, day } = partsOf(new Date(instant));
  return isoOf(year, month, day);
}

/** The time of an instant in Paris, in minutes since midnight. */
export function planMinuteOf(instant: Date | string): number {
  return partsOf(new Date(instant)).minute;
}

/** Noon UTC of a day: its weekday and its date never move with a time zone. */
const noonOf = (day: string) => new Date(`${day}T12:00:00Z`);

export function addDays(day: string, days: number): string {
  return new Date(noonOf(day).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((noonOf(to).getTime() - noonOf(from).getTime()) / DAY_MS);
}

/** 0 = Monday, as the opening hours (`PlaceHours.weekday`). */
export function weekdayOf(day: string): number {
  return (noonOf(day).getUTCDay() + 6) % 7;
}

/** Offset of Paris at an instant, in minutes east of UTC. */
function offsetAt(instant: number): number {
  const { year, month, day, minute } = partsOf(new Date(instant));
  const asUtc = Date.UTC(year, month - 1, day, 0, minute);
  return Math.round((asUtc - Math.floor(instant / MINUTE_MS) * MINUTE_MS) / MINUTE_MS);
}

/** The start of `day` at `minute`, with the offset of Paris on that day. */
export function planStartOf(day: string, minute: number): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  const wall = Date.UTC(year, month - 1, date, 0, minute);
  // Twice: the offset of the guess may differ from the one of the result around a change of time.
  let offset = offsetAt(wall);
  offset = offsetAt(wall - offset * MINUTE_MS);
  const sign = offset < 0 ? '-' : '+';
  const absolute = Math.abs(offset);
  const time = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00`;
  return `${day}T${time}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/** « 10:00 ». */
export const clockOf = (minute: number) => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

/** A time on the 15-minute grid, the suggested start rounded to the nearest quarter. */
export const roundToStep = (minute: number) =>
  Math.min(LAST_TIME_MIN, Math.round(minute / TIME_STEP_MIN) * TIME_STEP_MIN);

/** The first time of the grid still to come today: one cannot plan in the past. */
export function earliestMinuteOf(day: string, now: Date): number {
  if (day !== planDayOf(now)) {
    return 0;
  }
  return Math.min(
    LAST_TIME_MIN,
    Math.ceil((planMinuteOf(now) + 1) / TIME_STEP_MIN) * TIME_STEP_MIN,
  );
}

/** The weeks of a month, Monday first, the days outside the month null (« Choisir une date »). */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = isoOf(year, month, 1);
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: weekdayOf(first) }, () => null),
    ...Array.from({ length }, (_, index) => isoOf(year, month, index + 1)),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
