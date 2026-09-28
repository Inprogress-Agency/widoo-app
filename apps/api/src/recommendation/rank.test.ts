import { describe, expect, it } from 'vitest';
import { rankCandidates, reasonOf, type Candidate } from './rank';
import type { StableComponents } from './stable';
import { defaultWeights } from './weights';

// 10:00 in Paris: morning.
const now = new Date('2026-09-28T08:00:00Z');
const neutralStable: StableComponents = {
  quality: 0.5,
  rated: false,
  reliability: 0.5,
  freshness: 0.5,
  official: 0,
  moments: [],
};
const candidate = (
  id: string,
  distanceM: number,
  stable: Partial<StableComponents> = {},
  diversity: Pick<Candidate, 'mainMood' | 'neighborhood'> = { mainMood: null, neighborhood: null },
): Candidate => ({
  id,
  distanceM,
  stable: { ...neutralStable, ...stable },
  timezone: 'Europe/Paris',
  ...diversity,
});
const rank = (candidates: Candidate[], weights = defaultWeights, hasPosition = true) =>
  rankCandidates(candidates, { weights, now, hasPosition });
const ids = (ranked: { id: string }[]) => ranked.map(({ id }) => id);

describe('recommended ranking', () => {
  it('ranks by the weighted score, the closest first when all else is neutral', () => {
    expect(
      ids(rank([candidate('far', 3000), candidate('near', 200), candidate('mid', 1000)])),
    ).toEqual(['near', 'mid', 'far']);
  });

  it('lets a well rated, verified route overtake a closer one', () => {
    const good = candidate('good', 1500, { quality: 0.9, rated: true, reliability: 1 });
    expect(ids(rank([candidate('close', 500), good]))).toEqual(['good', 'close']);
  });

  it('follows the weights: proximity alone or quality alone', () => {
    const candidates = [
      candidate('close', 100),
      candidate('rated', 4000, { quality: 1, rated: true }),
    ];
    const only = (name: keyof typeof defaultWeights) =>
      ({
        ...Object.fromEntries(Object.keys(defaultWeights).map((key) => [key, 0])),
        [name]: 1,
      }) as typeof defaultWeights;
    expect(ids(rank(candidates, only('proximity')))).toEqual(['close', 'rated']);
    expect(ids(rank(candidates, only('quality')))).toEqual(['rated', 'close']);
  });

  it('puts a route with a flagged place below an unverified one', () => {
    expect(
      ids(rank([candidate('flagged', 100, { reliability: 0 }), candidate('plain', 100)])),
    ).toEqual(['plain', 'flagged']);
  });

  it('favours a route that suits the part of the day', () => {
    const brunch = candidate('brunch', 800, { moments: ['morning', 'midday'] });
    const bar = candidate('bar', 800, { moments: ['evening', 'night'] });
    expect(ids(rank([bar, brunch]))).toEqual(['brunch', 'bar']);
  });

  it('breaks ties on the id, the same way on every call', () => {
    expect(ids(rank([candidate('a', 500), candidate('b', 500)]))).toEqual(['b', 'a']);
  });

  it('runs the diversity pass after the score', () => {
    const marais = { mainMood: 'food', neighborhood: 'Le Marais' };
    const ranked = rank([
      candidate('first', 100, {}, marais),
      candidate('second', 200, {}, marais),
      candidate('third', 300, {}, { mainMood: 'culture', neighborhood: 'Le Marais' }),
    ]);
    expect(ids(ranked)).toEqual(['first', 'third', 'second']);
  });

  it('degrades to the proximity alone without ratings, verification or context', () => {
    const ranked = rank([candidate('b', 900), candidate('a', 300)]);
    expect(ranked.map(({ reason }) => reason?.key)).toEqual(['near_you', 'near_you']);
    expect(ids(ranked)).toEqual(['a', 'b']);
  });
});

describe('main reason', () => {
  const reason = (c: Candidate, hasPosition = true) =>
    rank([c], defaultWeights, hasPosition)[0]?.reason;

  it('names the distance of a route near the position', () => {
    expect(reason(candidate('a', 612.4))).toEqual({ key: 'near_you', distanceM: 612 });
  });

  it('never says near without a position, nor beyond 5 km', () => {
    expect(reason(candidate('a', 200), false)).toBeNull();
    expect(reason(candidate('a', 6000))).toBeNull();
  });

  it('names the component that weighs most among those worth saying', () => {
    const verified = candidate('a', 4800, { reliability: 1 });
    expect(reason(verified)).toEqual({ key: 'verified' });
    const topRated = candidate('a', 4800, { quality: 0.9, rated: true, reliability: 1 });
    expect(reason(topRated)).toEqual({ key: 'top_rated' });
    expect(reason(candidate('a', 4800, { freshness: 1 }))).toEqual({ key: 'fresh' });
    expect(reason(candidate('a', 4800, { official: 1 }))).toEqual({ key: 'official' });
    expect(reason(candidate('a', 4800, { moments: ['morning'] }))).toEqual({ key: 'good_timing' });
  });

  it('does not call a route top rated without ratings or below 4 out of 5', () => {
    expect(reason(candidate('a', 6000, { quality: 0.9, rated: false }))).toBeNull();
    expect(reason(candidate('a', 6000, { quality: 0.7, rated: true }))).toBeNull();
  });

  it('never names a component whose weight is zero', () => {
    const weights = { ...defaultWeights, reliability: 0 };
    const ranked = rankCandidates([candidate('a', 6000, { reliability: 1 })], {
      weights,
      now,
      hasPosition: true,
    });
    expect(ranked[0]?.reason).toBeNull();
    expect(
      reasonOf(
        candidate('a', 6000, { reliability: 1 }),
        { proximity: 0, quality: 0.5, reliability: 1, freshness: 0.5, context: 0.5, official: 0 },
        null,
        weights,
        true,
      ),
    ).toBeNull();
  });
});
