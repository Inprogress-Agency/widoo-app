import { localeTags, type SiteLocale } from '@/config/locales';

const nbsp = '\u00a0';

/** « 7 h », « 45 min », and « 3 h 30 » in French, « 3 h 30 min » in English (E-21). */
export function formatDuration(minutes: number, locale: SiteLocale): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest}${nbsp}min`;
  if (rest === 0) return `${hours}${nbsp}h`;
  if (locale === 'fr') return `${hours}${nbsp}h${nbsp}${String(rest).padStart(2, '0')}`;
  return `${hours}${nbsp}h${nbsp}${rest}${nbsp}min`;
}

/**
 * Budget per person as displayed (D-032): the exact sum rounded to 5 €, 5 € for a non zero sum
 * that would round to zero, `null` when the route is free (the caller shows « Gratuit »).
 */
export function roundBudget(euros: number): number | null {
  if (euros <= 0) return null;
  return Math.max(5, Math.round(euros / 5) * 5);
}

/** « ≈ 40 € » in French, « ≈ €40 » in English; `null` when the route is free. */
export function formatBudget(euros: number, locale: SiteLocale): string | null {
  const rounded = roundBudget(euros);
  if (rounded === null) return null;
  const amount = new Intl.NumberFormat(localeTags[locale].lang, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(rounded);
  return `≈${nbsp}${amount}`;
}

/** « 800 m », « 6,1 km ». */
export function formatDistance(meters: number, locale: SiteLocale): string {
  const kilometers = meters >= 1000;
  return new Intl.NumberFormat(localeTags[locale].lang, {
    style: 'unit',
    unit: kilometers ? 'kilometer' : 'meter',
    maximumFractionDigits: kilometers ? 1 : 0,
  }).format(kilometers ? meters / 1000 : Math.round(meters / 10) * 10);
}

/** « 4,9 » in French, « 4.9 » in English. */
export function formatRating(average: number, locale: SiteLocale): string {
  return new Intl.NumberFormat(localeTags[locale].lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}

/** « 20 sept. » in French, « Sep 20 » in English, in the time zone of Paris. */
export function formatShortDate(iso: string, locale: SiteLocale): string {
  return new Intl.DateTimeFormat(localeTags[locale].lang, {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso));
}

/** « il y a 3 jours », « yesterday »: how old a review is, in whole days (E-21). */
export function formatDaysAgo(iso: string, now: Date, locale: SiteLocale): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
  return new Intl.RelativeTimeFormat(localeTags[locale].lang, { numeric: 'auto' }).format(
    -days,
    'day',
  );
}
