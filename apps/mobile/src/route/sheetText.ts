import type {
  PlaceHours,
  RouteCard,
  RouteDetailStep,
  SheetStep,
  StepTransition,
} from '@widoo/shared';
import type { UiIconKey } from '@widoo/tokens';
import type { TFunction } from 'i18next';
import { formatBudget } from '../format/budget';
import { formatDistance } from '../format/distance';
import { formatDuration } from '../format/duration';
import { dateFormat } from '../i18n/formats';

/**
 * Texts of the route sheet (Ecrans › E-05), pure functions of the route and of the time, so that
 * the screen and its tests write a route the same way. Times and hours are those of the city of
 * the route (`RouteDetail.timezone`), never those of the phone: « Ouvert aujourd'hui » is read at
 * the time of Paris.
 */

/** Paris, the only city: the zone of what does not carry its own (a withdrawal, a review list). */
export const DEFAULT_TIME_ZONE = 'Europe/Paris';

/** The day (« 2026-10-13 ») and the weekday (« Tue ») of a date in a zone, one pair per zone. */
const dayFormats = new Map<string, { isoDay: Intl.DateTimeFormat; weekday: Intl.DateTimeFormat }>();
function dayFormatsOf(timeZone: string) {
  let formats = dayFormats.get(timeZone);
  if (!formats) {
    formats = {
      isoDay: new Intl.DateTimeFormat('en-CA', { timeZone }),
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }),
    };
    dayFormats.set(timeZone, formats);
  }
  return formats;
}
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MS = 86_400_000;
const MONTH_DAYS = 30;

export interface Spoken {
  short: string;
  spoken: string;
}

/**
 * « 10:35 » in the zone of the city, said « 10 heures 35 »; « 10 heures » on the hour; in English,
 * said as written.
 */
export function localTime(t: TFunction, iso: string, timeZone = DEFAULT_TIME_ZONE): Spoken {
  const short = dateFormat({ hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso));
  const [hours = 0, minutes = 0] = short.split(':').map(Number);
  const spoken =
    minutes === 0
      ? t('clock.spoken.onTheHour', { count: hours, time: short })
      : t('clock.spoken.time', { count: hours, minutes, time: short });
  return { short, spoken };
}

/** « 20 sept. », « 20 Sept », in the zone of the city. */
export const localDay = (iso: string, timeZone = DEFAULT_TIME_ZONE) =>
  dateFormat({ day: 'numeric', month: 'short', timeZone }).format(new Date(iso));

/** « 22 sept » before the full stop of a sentence, never « sept.. ». */
export const withoutFinalDot = (text: string) => text.replace(/\.$/, '');

/** The slots of a place on the day of `now` in its city, seasonal hours included when valid. */
export function todaySlots(
  hours: readonly PlaceHours[],
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
): PlaceHours[] {
  const formats = dayFormatsOf(timeZone);
  const weekday = weekdays.indexOf(formats.weekday.format(now));
  const today = formats.isoDay.format(now);
  return hours.filter(
    (slot) =>
      slot.weekday === weekday &&
      (slot.validFrom === null || slot.validFrom <= today) &&
      (slot.validTo === null || slot.validTo >= today),
  );
}

const hhmm = (time: string) => time.slice(0, 5);

function slotsText(t: TFunction, slots: readonly PlaceHours[]): Spoken {
  const join = (form: 'slot' | 'slotSpoken') =>
    slots
      .map((slot) =>
        t(`route.step.${form}`, { opens: hhmm(slot.opens), closes: hhmm(slot.closes) }),
      )
      .join(t('route.step.hoursSeparator'));
  return { short: join('slot'), spoken: join('slotSpoken') };
}

/** Hours line of an unfolded step, null when the hours of its place are unknown. */
export type HoursLine =
  { kind: 'open'; hours: string; spoken: string } | { kind: 'closed' | 'usual'; text: string };

/**
 * « Ouvert » in green then « aujourd'hui, 10:00 – 19:00 »; a reported place gives its usual
 * hours instead, without « Ouvert » (D-013). Today is the day of `now` in the city of the route.
 */
export function hoursLine(
  t: TFunction,
  step: RouteDetailStep,
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
): HoursLine | null {
  if (step.place.hours.length === 0) {
    return null;
  }
  const slots = todaySlots(step.place.hours, now, timeZone);
  if (step.verification.reports) {
    const usual = slots.length > 0 ? slots : step.place.hours.slice(0, 1);
    return {
      kind: 'usual',
      text: t('route.step.usualHours', { hours: slotsText(t, usual).short }),
    };
  }
  if (slots.length === 0) {
    return { kind: 'closed', text: t('route.step.closedToday') };
  }
  const { short, spoken } = slotsText(t, slots);
  return {
    kind: 'open',
    hours: t('route.step.today', { hours: short }),
    spoken: t('route.step.todaySpoken', { hours: spoken }),
  };
}

/** « il y a 4 mois », « il y a 12 jours ». */
export function agoText(t: TFunction, iso: string, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS));
  return days < MONTH_DAYS
    ? t('route.ago.days', { count: days })
    : t('route.ago.months', { count: Math.floor(days / MONTH_DAYS) });
}

/** What the visitors said of the place of a step (D-013, D-056), read only. */
export type VerificationText =
  | { kind: 'verified' | 'never'; text: string }
  | { kind: 'stale'; text: string }
  | { kind: 'reported'; banner: string; lastVisit: string | null };

export function verificationText(t: TFunction, step: RouteDetailStep, now: Date): VerificationText {
  const { confirmations, lastConfirmedAt, reports } = step.verification;
  if (reports) {
    return {
      kind: 'reported',
      banner: t('route.step.reportedBanner', {
        count: reports.count,
        date: withoutFinalDot(localDay(reports.lastAt)),
      }),
      lastVisit: lastConfirmedAt && t('route.step.lastVisit', { date: localDay(lastConfirmedAt) }),
    };
  }
  if (lastConfirmedAt === null) {
    return { kind: 'never', text: t('route.step.neverChecked') };
  }
  if (step.place.verificationStatus === 'stale') {
    return {
      kind: 'stale',
      text: t('route.step.lastCheck', { ago: agoText(t, lastConfirmedAt, now) }),
    };
  }
  const date = localDay(lastConfirmedAt);
  return {
    kind: 'verified',
    text:
      confirmations > 0
        ? t('route.step.verifiedBy', { count: confirmations, date })
        : t('route.step.verifiedOn', { date }),
  };
}

/** « 15 min à pied (1,1 km) », said « 15 minutes à pied, 1,1 kilomètre ». */
export function transitionText(t: TFunction, transition: StepTransition): Spoken {
  const mode = t(`route.modes.${transition.mode}`);
  return {
    short: t('route.transition', {
      duration: formatDuration(t, transition.durationMin, 'short'),
      mode,
      distance: formatDistance(t, transition.distanceM, 'short'),
    }),
    spoken: t('route.transitionSpoken', {
      duration: formatDuration(t, transition.durationMin, 'spoken'),
      mode,
      distance: formatDistance(t, transition.distanceM, 'spoken'),
    }),
  };
}

/**
 * The line under the tiles when places are reported (D-013): « Café Lomi signalé, peut-être
 * fermé », or « 2 lieux signalés »; « Voir l'étape » leads to the first one.
 */
export function reportedLine(
  t: TFunction,
  steps: readonly SheetStep[],
): { text: string; firstIndex: number; place: string } | null {
  const reported = steps.flatMap((step, index) =>
    !step.isLocked && step.verification.reports ? [{ index, place: step.place.name }] : [],
  );
  const [first] = reported;
  if (!first) {
    return null;
  }
  const text =
    reported.length === 1
      ? t('route.placeReported', { place: first.place })
      : t('route.placesReported', { count: reported.length });
  return { text, firstIndex: first.index, place: first.place };
}

/** One of the four key figures under the title. */
export interface TileText {
  key: 'duration' | 'budget' | 'distance' | 'steps';
  icon: UiIconKey;
  value: string;
  label: string;
  spoken: string;
}

type TileRoute = Pick<RouteCard, 'durationMin' | 'budgetPerPersonEur' | 'distanceM' | 'stepCount'>;

/**
 * Duration, budget (« ≈ 25 € » « Par pers. », « Gratuit », said « environ 25 euros par
 * personne », D-032), distance and number of steps.
 */
export function tilesText(t: TFunction, route: TileRoute): TileText[] {
  const budget = formatBudget(t, route);
  const spoken = (value: string, label: string) => t('route.tiles.spoken', { value, label });
  const durationLabel = t('route.tiles.duration');
  const distanceLabel = t('route.tiles.distance');
  const stepsLabel = t('route.tiles.steps');
  return [
    {
      key: 'duration',
      icon: 'duration',
      value: formatDuration(t, route.durationMin, 'short'),
      label: durationLabel,
      spoken: spoken(formatDuration(t, route.durationMin, 'spoken'), durationLabel.toLowerCase()),
    },
    {
      key: 'budget',
      icon: 'budget',
      value: budget.amount,
      label: budget.perPerson ? t('route.tiles.perPerson') : t('route.tiles.free'),
      spoken: budget.spoken,
    },
    {
      key: 'distance',
      icon: 'distance',
      value: formatDistance(t, route.distanceM, 'short'),
      label: distanceLabel,
      spoken: spoken(formatDistance(t, route.distanceM, 'spoken'), distanceLabel.toLowerCase()),
    },
    {
      key: 'steps',
      icon: 'steps',
      value: String(route.stepCount),
      label: stepsLabel,
      spoken: spoken(String(route.stepCount), stepsLabel.toLowerCase()),
    },
  ];
}
