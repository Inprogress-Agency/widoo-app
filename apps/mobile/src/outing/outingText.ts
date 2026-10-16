import type { PlannedRoute } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { capitalize } from '../i18n/formats';
import { clockOf, daysBetween, planDayOf, planMinuteOf } from '../plan/calendar';
import { fullDayName } from '../plan/planText';

/** Texts of « Votre sortie » (Ecrans › E-08): its card of date and the days to it. */

const timeOf = (instant: string) => clockOf(planMinuteOf(instant));

/** « Samedi 26 septembre » and « Départ 10:00, fin vers 17:00 », from the timeline planned. */
export function dateCardText(t: TFunction, outing: PlannedRoute, now: Date) {
  const day = capitalize(fullDayName(planDayOf(outing.startsAt), planDayOf(now)));
  const hours = t('routes.outing.hours', {
    start: timeOf(outing.timeline.startsAt),
    end: timeOf(outing.timeline.endsAt),
  });
  return { day, hours, spoken: `${day}, ${hours}` };
}

/** Days from today to the outing, 0 on its day or after it: `days_ahead` of the analytics. */
export const daysAhead = (outing: PlannedRoute, now: Date) =>
  Math.max(0, daysBetween(planDayOf(now), planDayOf(outing.startsAt)));
