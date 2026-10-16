import type { OwnRouteSummary, PlannedRoute } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { capitalize } from '../i18n/formats';
import { clockOf, daysBetween, planDayOf, planMinuteOf } from '../plan/calendar';
import { dayChipText, fullDayName } from '../plan/planText';
import { ratingLabel } from '../rating/endText';
import { createdPillOf } from './lists';

/** Texts of E-08 (Ecrans › E-08): the dates of the outings and the lines of the creations. */

const timeOf = (instant: string) => clockOf(planMinuteOf(instant));

/** « Demain, 10:00 » on the photo of the next outing; « Sam. 26, 10:00 » further. */
export function nextBadge(t: TFunction, outing: PlannedRoute, now: Date) {
  const { label, spoken } = dayChipText(t, planDayOf(outing.startsAt), planDayOf(now));
  const time = timeOf(outing.startsAt);
  return {
    label: t('routes.upcoming.badge', { day: label, time }),
    spoken: t('routes.upcoming.badge', { day: spoken, time }),
  };
}

/** « Samedi 26 septembre, 10:00 à 17:00 environ », from the timeline of the outing. */
export function outingWindow(t: TFunction, outing: PlannedRoute, now: Date) {
  const values = {
    day: capitalize(fullDayName(planDayOf(outing.startsAt), planDayOf(now))),
    start: timeOf(outing.timeline.startsAt),
    end: timeOf(outing.timeline.endsAt),
  };
  return {
    label: t('routes.upcoming.window', values),
    spoken: t('routes.upcoming.windowSpoken', values),
  };
}

/** « Dimanche 4 octobre, 14:00 », a line of « Plus tard ». */
export function laterLine(t: TFunction, outing: PlannedRoute, now: Date) {
  return t('routes.upcoming.line', {
    day: capitalize(fullDayName(planDayOf(outing.startsAt), planDayOf(now))),
    time: timeOf(outing.startsAt),
  });
}

/**
 * The date of a past line: « Fait le samedi 19 septembre », « Prévu le dimanche 20 septembre »
 * for an outing not done, the day alone for one stopped (its pill says why).
 */
export function pastDate(t: TFunction, outing: PlannedRoute, now: Date) {
  const day = fullDayName(planDayOf(outing.completedAt ?? outing.startsAt), planDayOf(now));
  if (outing.status === 'completed') {
    return t('routes.past.done', { day });
  }
  return outing.status === 'missed' ? t('routes.past.planned', { day }) : capitalize(day);
}

/** « 5 », « Votre note, Parfait », and what a screen reader says of it. */
export function myRatingText(t: TFunction, rating: number) {
  const label = ratingLabel(t, rating);
  return {
    value: String(rating),
    label: t('routes.past.myRating', { label }),
    spoken: t('routes.past.myRatingSpoken', { rating, label }),
  };
}

/** The title of a creation, « Nouveau parcours » until the author names it. */
export const createdTitle = (t: TFunction, route: OwnRouteSummary) =>
  route.title ?? t('routes.created.untitled');

/** The line under a creation: when a draft moved, the link of a private one, the steps. */
export function createdDetail(t: TFunction, route: OwnRouteSummary, now: Date): string {
  const pill = createdPillOf(route);
  if (pill === 'draft') {
    const days = daysBetween(planDayOf(route.updatedAt), planDayOf(now));
    if (days <= 0) {
      return t('routes.created.edited.today');
    }
    return days === 1
      ? t('routes.created.edited.yesterday')
      : t('routes.created.edited.daysAgo', { count: days });
  }
  if (pill === 'private') {
    return t('routes.created.privateLink');
  }
  return t('routes.created.steps', { count: route.stepCount });
}
