import { localeTags, type SiteLocale } from '@/config/locales';
import type { Messages } from '@/messages';
import { formatDuration, formatRating, roundBudget } from '../format';
import { fill } from '../i18n/fill';
import type { ExampleRoute } from './types';

/** The example route of a mood, ready to display (E-21 › Envies). */
export type ExampleRouteDisplay = {
  title: string;
  /** « 3 h, 25 €, par Camille ». */
  meta: string;
  rating: { average: number; value: string; reviews: string; spoken: string } | null;
  /** Initial of the creator in its disc; null for a route of the team (logo of Widoo). */
  authorInitial: string | null;
};

export function describeExampleRoute(
  route: ExampleRoute,
  locale: SiteLocale,
  messages: Messages,
): ExampleRouteDisplay {
  const texts = messages.ideas;
  const rounded = roundBudget(route.budgetPerPersonEur);
  const budget =
    rounded === null
      ? texts.free
      : new Intl.NumberFormat(localeTags[locale].lang, {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(rounded);
  const author =
    route.author.kind === 'widoo'
      ? texts.byWidoo
      : fill(texts.byMember, { name: route.author.firstName });
  const value = route.rating && formatRating(route.rating.average, locale);

  return {
    title: route.title,
    meta: fill(texts.routeMeta, {
      duration: formatDuration(route.durationMin, locale),
      budget,
      author,
    }),
    rating:
      route.rating && value
        ? {
            average: route.rating.average,
            value,
            reviews: fill(messages.sharedRoute.reviews, { count: route.rating.count }),
            spoken: fill(messages.sharedRoute.ratingSpoken, {
              rating: value,
              count: route.rating.count,
            }),
          }
        : null,
    authorInitial:
      route.author.kind === 'member'
        ? route.author.firstName.charAt(0).toLocaleUpperCase(locale)
        : null,
  };
}

/**
 * Width of the filled stars of a rating, in px, for stars of `size` spaced by `gap` (E-21: filled
 * to the tenth): 4.8 fills four stars and 80 % of the fifth.
 */
export function filledStarsWidth(average: number, size: number, gap: number): number {
  const clamped = Math.min(5, Math.max(0, average));
  const full = Math.floor(clamped);
  if (full === 5) return 5 * size + 4 * gap;
  return Math.round((full * (size + gap) + (clamped - full) * size) * 10) / 10;
}
