import { labels, type LatLng, type RouteCard } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { formatBudget, type BudgetText } from '../format/budget';
import { formatDistance } from '../format/distance';
import { formatDuration } from '../format/duration';
import { formatRating } from '../format/rating';
import { distanceBetweenM } from '../map/geo';

/** Everything a card writes, and what a screen reader says of it in one label. */
export interface CardText {
  /** « Nature · 10e · République »: main mood, arrondissement, neighbourhood, when known. */
  place: string;
  /** « Par Camille », « Par Widoo »; « Membre Widoo » for a profile that is not public. */
  creator: string;
  budget: BudgetText;
  duration: { short: string; spoken: string };
  /** From the user to the start of the route; null without position. */
  distance: { short: string; spoken: string } | null;
  label: string;
}

/**
 * Text of a route card (Ecrans › E-01, carte de parcours): a pure function, so that the card, the
 * summary of a selected route and « Voir tout » (#62) write a route the same way.
 */
export function cardText(t: TFunction, route: RouteCard, position: LatLng | null): CardText {
  const mood = route.moods[0];
  const place = [mood && labels.fr.moods[mood], route.district, route.neighborhood]
    .filter(Boolean)
    .join(' · ');
  const creator = route.isOfficial
    ? t('card.byWidoo')
    : route.author
      ? t('card.by', { name: route.author.firstName })
      : t('card.member');
  const budget = formatBudget(t, route);
  const duration = {
    short: formatDuration(t, route.durationMin, 'short'),
    spoken: formatDuration(t, route.durationMin, 'spoken'),
  };
  const start = route.steps[0];
  const meters = position && start ? distanceBetweenM(position, start.location) : null;
  const distance =
    meters === null
      ? null
      : { short: formatDistance(t, meters, 'short'), spoken: formatDistance(t, meters, 'spoken') };

  const { average, count } = route.rating;
  const badges = [
    route.access === 'premium' && t('badges.premium'),
    route.isOfficial && t('badges.signature'),
    route.isVerified && t('badges.verified'),
  ];
  const label = [
    route.title,
    place.replaceAll(' · ', ', '),
    creator,
    average === null || count === 0
      ? t('badges.new')
      : t('rating.label', { value: formatRating(average) }),
    ...badges,
    budget.spoken,
    duration.spoken,
    distance && t('card.distance', { distance: distance.spoken }),
  ]
    .filter(Boolean)
    .join(', ');
  return { place, creator, budget, duration, distance, label };
}
