/**
 * Components of the recommendation score (wiki Filtres-et-Recherche › Recommandation « autour de
 * moi »), each normalised between 0 and 1. Pure functions: the nightly job computes the stable
 * ones, the search the proximity and the context. Without ratings or verification, a component
 * answers its neutral value, 0.5, so that it neither favours nor penalises a route.
 */
import type { PlaceCategory, VerificationStatus } from '@widoo/shared';

export const neutral = 0.5;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 1 at the reference point, 0 from 5 km: distance to the start of the route. */
export const proximityRadiusM = 5000;
export function proximityOf(distanceM: number): number {
  return clamp01(1 - distanceM / proximityRadiusM);
}

/** Ratings that weigh as much as the prior: 5 ratings neutralise it. */
export const priorRatingCount = 5;
/** Middle of the 1 to 5 scale: the prior when no route has a rating yet. */
export const defaultPriorMean = 3;

/**
 * Bayesian average of the ratings, the mean of every rated route as prior, brought from 1–5 to
 * 0–1. No rating: 0.5, whatever the prior.
 */
export function qualityOf(
  rating: { average: number | null; count: number },
  priorMean: number = defaultPriorMean,
): number {
  if (rating.average === null || rating.count <= 0) return neutral;
  const bayesian =
    (priorRatingCount * priorMean + rating.count * rating.average) /
    (priorRatingCount + rating.count);
  return clamp01((bayesian - 1) / 4);
}

/**
 * Share of verified places, from 0.5 (none verified yet, the launch state) to 1 (all verified).
 * One flagged place drops the route to 0: the strong penalty of the wiki.
 */
export function reliabilityOf(statuses: readonly VerificationStatus[]): number {
  if (statuses.length === 0) return neutral;
  if (statuses.includes('flagged')) return 0;
  const verified = statuses.filter((status) => status === 'verified').length;
  return neutral + (1 - neutral) * (verified / statuses.length);
}

const dayMs = 86_400_000;
/** Fresh for 30 days after publication or recomputation, then down to 0 at 180 days. */
export const freshDays = 30;
export const staleDays = 180;

/** Freshness of the latest of the publication and the recomputation; 0.5 without any date. */
export function freshnessOf(dates: readonly (Date | null)[], now: Date): number {
  const times = dates.flatMap((date) => (date ? [date.getTime()] : []));
  if (times.length === 0) return neutral;
  const days = (now.getTime() - Math.max(...times)) / dayMs;
  if (days <= freshDays) return 1;
  return clamp01(1 - (days - freshDays) / (staleDays - freshDays));
}

/** Parts of the day, in the local time of the city. */
export const dayParts = ['morning', 'midday', 'afternoon', 'evening', 'night'] as const;
export type DayPart = (typeof dayParts)[number];

/** 6–11 h morning, 11–14 h midday, 14–18 h afternoon, 18–23 h evening, night otherwise. */
export function dayPartOf(now: Date, timezone: string): DayPart {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: timezone,
    }).format(now),
  );
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

const daytime: DayPart[] = ['morning', 'midday', 'afternoon'];

/**
 * When a route suits, from the category of its first step: a brunch in the morning, a rooftop
 * in the evening. `other` says nothing: no part, a neutral time match.
 */
const momentsByCategory: Record<PlaceCategory, DayPart[]> = {
  cafe: daytime,
  bakery: ['morning', 'midday'],
  restaurant: ['midday', 'evening'],
  bar: ['evening', 'night'],
  event_venue: ['evening'],
  museum: daytime,
  gallery: daytime,
  monument: daytime,
  shop: daytime,
  park: daytime,
  walk: daytime,
  activity: daytime,
  viewpoint: [...daytime, 'evening'],
  other: [],
};

export function momentsOf(firstCategory: PlaceCategory | null): DayPart[] {
  return firstCategory ? momentsByCategory[firstCategory] : [];
}

/** 1 when the route suits the part of the day, 0 when it suits others, null when unknown. */
export function timeMatchOf(moments: readonly DayPart[], dayPart: DayPart): number | null {
  if (moments.length === 0) return null;
  return moments.includes(dayPart) ? 1 : 0;
}

/**
 * Context: mean of the known signals, 0.5 without any. The weather signal is the extension point
 * of #31 (conditions of the route against the weather of the day); until then it is null.
 */
export function contextOf(signals: {
  timeMatch: number | null;
  weatherMatch: number | null;
}): number {
  const known = [signals.timeMatch, signals.weatherMatch].filter(
    (signal): signal is number => signal !== null,
  );
  if (known.length === 0) return neutral;
  return clamp01(known.reduce((sum, signal) => sum + signal, 0) / known.length);
}

/** « Par Widoo ». */
export const officialOf = (isOfficial: boolean): number => (isOfficial ? 1 : 0);
