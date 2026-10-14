import type { TFunction } from 'i18next';
import { clockOf, daysBetween, planDayOf, planMinuteOf } from './calendar';

/**
 * Texts of the planning sheet (Ecrans › E-06): its days, its button and its toast. Pure, so that
 * the sheet and its tests write a day the same way. A day is a calendar date: formatted at noon
 * UTC, it never moves with the time zone of the phone.
 */

/** « Aujourd'hui », « Demain » and the day after, before « Autre date ». */
export const PROPOSED_DAYS = 3;

const format = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options });
const weekdayLong = format({ weekday: 'long' });
const weekdayShort = format({ weekday: 'short' });
const monthLong = format({ month: 'long' });
const monthShort = format({ month: 'short' });

const noonOf = (day: string) => new Date(`${day}T12:00:00Z`);
const dateNumber = (day: string) => Number(day.slice(8, 10));
const yearOf = (day: string) => day.slice(0, 4);
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1);

export const isProposedDay = (day: string, today: string) => {
  const ahead = daysBetween(today, day);
  return ahead >= 0 && ahead < PROPOSED_DAYS;
};

/** « samedi 26 septembre », the year after it when it is not this one. */
export function fullDayName(day: string, today: string): string {
  const name = `${weekdayLong.format(noonOf(day))} ${dateNumber(day)} ${monthLong.format(noonOf(day))}`;
  return yearOf(day) === yearOf(today) ? name : `${name} ${yearOf(day)}`;
}

/** « samedi 26 » for a proposed day, « samedi 23 janvier » otherwise (E-06, the button). */
export function dayName(day: string, today: string): string {
  return isProposedDay(day, today)
    ? `${weekdayLong.format(noonOf(day))} ${dateNumber(day)}`
    : fullDayName(day, today);
}

/** « Dim. 27 », and « Sam. 23 janv. » for the day chosen in the calendar. */
export function shortDayName(day: string, today: string): string {
  const weekday = capitalize(weekdayShort.format(noonOf(day)));
  return isProposedDay(day, today)
    ? `${weekday} ${dateNumber(day)}`
    : `${weekday} ${dateNumber(day)} ${monthShort.format(noonOf(day))}`;
}

/** The label of a day chip, and what a screen reader says of it. */
export function dayChipText(t: TFunction, day: string, today: string) {
  const ahead = daysBetween(today, day);
  const label =
    ahead === 0 ? t('plan.today') : ahead === 1 ? t('plan.tomorrow') : shortDayName(day, today);
  const full = fullDayName(day, today);
  return { label, spoken: ahead <= 1 ? t('plan.daySpoken', { label, day: full }) : full };
}

/** « Programmer samedi 26 à 10:00 », or « Déplacer au dimanche 27 à 11:00 » for a planning. */
export function submitLabel(
  t: TFunction,
  isEdit: boolean,
  day: string,
  minute: number,
  today: string,
): string {
  const values = { day: dayName(day, today), time: clockOf(minute) };
  return isEdit ? t('plan.move', values) : t('plan.submit', values);
}

/** The second line of the toast: « Samedi 26 septembre à 10:00 ». */
export function plannedSubtitle(t: TFunction, day: string, minute: number, today: string) {
  return capitalize(
    t('plan.toast.subtitle', { day: fullDayName(day, today), time: clockOf(minute) }),
  );
}

/** « Sam. 26, 10:00 », in place of « Programmer » on the sheet of a planned route (E-05). */
export function plannedDateText(t: TFunction, startsAt: string, now: Date) {
  const day = planDayOf(startsAt);
  const today = planDayOf(now);
  const time = clockOf(planMinuteOf(startsAt));
  return {
    label: t('plan.plannedDate', { day: shortDayName(day, today), time }),
    spoken: t('plan.plannedDateSpoken', { day: fullDayName(day, today), time }),
  };
}
