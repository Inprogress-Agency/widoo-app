/**
 * Recommended order of the routes of a search (wiki Filtres-et-Recherche › Recommandation
 * « autour de moi »): the weighted score, the diversity pass, and the main reason of each card.
 */
import type { RecommendationReason } from '@widoo/shared';
import { contextOf, dayPartOf, proximityOf, timeMatchOf, type DayPart } from './components';
import { diversify, type DiversityKey } from './diversity';
import type { StableComponents } from './stable';
import { scoreOf, type Components, type RecommendationWeights } from './weights';

/** A route that passed the filters, with what its score needs. */
export type Candidate = DiversityKey & {
  id: string;
  /** From the start of the route to the position, or to the centre of the zone without one. */
  distanceM: number;
  stable: StableComponents;
  /** Of the city of the route: the part of the day is local. */
  timezone: string;
};

export type Ranked = { id: string; score: number; reason: RecommendationReason | null };

/** « Très bien noté » from a Bayesian 4 out of 5. */
const topRatedQuality = 0.75;

/**
 * The component that weighs most among those worth saying. `near_you` only with a position:
 * the centre of the zone is nobody's place.
 */
export function reasonOf(
  candidate: Pick<Candidate, 'distanceM' | 'stable'>,
  components: Components,
  timeMatch: number | null,
  weights: RecommendationWeights,
  hasPosition: boolean,
): RecommendationReason | null {
  const { stable } = candidate;
  const options: [RecommendationReason, number, boolean][] = [
    [
      { key: 'near_you', distanceM: Math.round(candidate.distanceM) },
      weights.proximity * components.proximity,
      hasPosition && components.proximity > 0,
    ],
    [
      { key: 'top_rated' },
      weights.quality * components.quality,
      stable.rated && stable.quality >= topRatedQuality,
    ],
    [{ key: 'verified' }, weights.reliability * components.reliability, stable.reliability === 1],
    [{ key: 'fresh' }, weights.freshness * components.freshness, stable.freshness === 1],
    [{ key: 'good_timing' }, weights.context * components.context, timeMatch === 1],
    [{ key: 'official' }, weights.official * components.official, stable.official === 1],
  ];
  let best: [RecommendationReason, number] | null = null;
  for (const [reason, contribution, isWorthSaying] of options) {
    if (isWorthSaying && contribution > 0 && (!best || contribution > best[1])) {
      best = [reason, contribution];
    }
  }
  return best?.[0] ?? null;
}

/**
 * Candidates by score, best first, the id breaking ties, then diversified. `now` sets the part
 * of the day; the weather is neutral until #31.
 */
export function rankCandidates(
  candidates: readonly Candidate[],
  options: { weights: RecommendationWeights; now: Date; hasPosition: boolean },
): Ranked[] {
  const dayParts = new Map<string, DayPart>();
  const dayPartIn = (timezone: string) => {
    let part = dayParts.get(timezone);
    if (!part) {
      part = dayPartOf(options.now, timezone);
      dayParts.set(timezone, part);
    }
    return part;
  };
  const scored = candidates.map((candidate) => {
    const { stable } = candidate;
    const timeMatch = timeMatchOf(stable.moments, dayPartIn(candidate.timezone));
    const components: Components = {
      proximity: proximityOf(candidate.distanceM),
      quality: stable.quality,
      reliability: stable.reliability,
      freshness: stable.freshness,
      context: contextOf({ timeMatch, weatherMatch: null }),
      official: stable.official,
    };
    return {
      id: candidate.id,
      mainMood: candidate.mainMood,
      neighborhood: candidate.neighborhood,
      score: scoreOf(components, options.weights),
      reason: reasonOf(candidate, components, timeMatch, options.weights, options.hasPosition),
    };
  });
  scored.sort((a, b) => b.score - a.score || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  return diversify(scored).map(({ id, score, reason }) => ({ id, score, reason }));
}
