import type { SiteLocale } from '@/config/locales';
import type { Messages } from '@/messages';
import { formatBudget, formatDistance, formatDuration, formatRating } from '../format';
import { fill, plural } from '../i18n/fill';
import type { SharedRoute } from './types';

/** The texts of the card of a shared route, ready to display (E-21). */
export type SharedRouteDisplay = {
  /** « Culture, 18e, Abbesses ». */
  place: string;
  duration: string;
  /** « ≈ 40 € » or « Gratuit », read « environ 40 € par personne » by a screen reader. */
  budget: { text: string; spoken: string };
  distance: string;
  /** « 4 étapes » on the phone; the number and « Étapes » in the tiles of the computer. */
  steps: { text: string; count: string };
  rating: { value: string; reviews: string; spoken: string } | null;
  /** « Par Widoo », « Par Camille », or for a private link « Partagé par Camille, visible… ». */
  author: string;
  /** Initial of the creator, in the disc of a private link; null for a route of the team. */
  authorInitial: string | null;
};

export function describeSharedRoute(
  route: SharedRoute,
  locale: SiteLocale,
  messages: Messages,
  { isPrivate = false }: { isPrivate?: boolean } = {},
): SharedRouteDisplay {
  const texts = messages.sharedRoute;
  const place = [route.mood && messages.moods[route.mood], route.district, route.neighborhood]
    .filter(Boolean)
    .join(', ');
  const budget = formatBudget(route.budgetPerPersonEur, locale);
  const rating = route.rating && {
    value: formatRating(route.rating.average, locale),
    count: route.rating.count,
  };

  return {
    place,
    duration: formatDuration(route.durationMin, locale),
    budget: budget
      ? {
          text: budget,
          spoken: fill(texts.budgetSpoken, { amount: budget.replace('≈', '').trim() }),
        }
      : { text: texts.free, spoken: texts.free },
    distance: formatDistance(route.distanceM, locale),
    steps: { text: plural(route.stepCount, texts.steps, locale), count: String(route.stepCount) },
    rating: rating && {
      value: rating.value,
      reviews: fill(texts.reviews, { count: rating.count }),
      spoken: fill(texts.ratingSpoken, { rating: rating.value, count: rating.count }),
    },
    author:
      route.author.kind === 'widoo'
        ? texts.byWidoo
        : fill(isPrivate ? texts.sharedBy : texts.byMember, { name: route.author.firstName }),
    authorInitial:
      route.author.kind === 'member'
        ? route.author.firstName.charAt(0).toLocaleUpperCase(locale)
        : null,
  };
}
