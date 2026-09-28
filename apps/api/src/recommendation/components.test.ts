import { describe, expect, it } from 'vitest';
import {
  contextOf,
  dayPartOf,
  freshnessOf,
  momentsOf,
  officialOf,
  proximityOf,
  qualityOf,
  reliabilityOf,
  timeMatchOf,
} from './components';

describe('proximity', () => {
  it('goes from 1 at the reference point to 0 at 5 km, and stays at 0 beyond', () => {
    expect(proximityOf(0)).toBe(1);
    expect(proximityOf(600)).toBeCloseTo(0.88);
    expect(proximityOf(2500)).toBe(0.5);
    expect(proximityOf(5000)).toBe(0);
    expect(proximityOf(12_000)).toBe(0);
  });
});

describe('quality', () => {
  it('is 0.5 without any rating, whatever the prior', () => {
    expect(qualityOf({ average: null, count: 0 }, 4.2)).toBe(0.5);
    expect(qualityOf({ average: 5, count: 0 }, 4.2)).toBe(0.5);
  });

  it('pulls a few ratings towards the prior, 5 ratings weighing as much as it', () => {
    // (5 × 3 + 5 × 5) / 10 = 4, brought to 0–1.
    expect(qualityOf({ average: 5, count: 5 }, 3)).toBe(0.75);
    // A single 5 barely moves away from the prior.
    expect(qualityOf({ average: 5, count: 1 }, 3)).toBeCloseTo((20 / 6 - 1) / 4);
    expect(qualityOf({ average: 1, count: 1 }, 3)).toBeCloseTo((16 / 6 - 1) / 4);
  });

  it('follows the ratings once they outnumber the prior', () => {
    expect(qualityOf({ average: 4.8, count: 500 }, 3)).toBeCloseTo(0.945, 2);
    expect(qualityOf({ average: 5, count: 1 }, 3)).toBeLessThan(
      qualityOf({ average: 4.6, count: 40 }, 3),
    );
  });

  it('takes the middle of the scale as prior by default', () => {
    expect(qualityOf({ average: 3, count: 7 })).toBe(0.5);
  });
});

describe('reliability', () => {
  it('goes from 0.5 without any verified place to 1 when all are verified', () => {
    expect(reliabilityOf(['stale', 'stale'])).toBe(0.5);
    expect(reliabilityOf(['verified', 'stale'])).toBe(0.75);
    expect(reliabilityOf(['verified', 'verified', 'verified'])).toBe(1);
  });

  it('drops to 0 with one flagged place', () => {
    expect(reliabilityOf(['verified', 'verified', 'flagged'])).toBe(0);
  });

  it('is neutral for a route without places', () => {
    expect(reliabilityOf([])).toBe(0.5);
  });
});

describe('freshness', () => {
  const now = new Date('2026-09-28T12:00:00Z');
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

  it('is 1 for 30 days, then decreases to 0 at 180 days', () => {
    expect(freshnessOf([daysAgo(0)], now)).toBe(1);
    expect(freshnessOf([daysAgo(30)], now)).toBe(1);
    expect(freshnessOf([daysAgo(105)], now)).toBeCloseTo(0.5);
    expect(freshnessOf([daysAgo(180)], now)).toBe(0);
    expect(freshnessOf([daysAgo(400)], now)).toBe(0);
  });

  it('counts from the latest of the publication and the recomputation', () => {
    expect(freshnessOf([daysAgo(300), daysAgo(10)], now)).toBe(1);
    expect(freshnessOf([null, daysAgo(105)], now)).toBeCloseTo(0.5);
  });

  it('is neutral without any date', () => {
    expect(freshnessOf([null, null], now)).toBe(0.5);
  });
});

describe('context', () => {
  it('reads the part of the day in the local time of the city', () => {
    // 07:30 UTC is 09:30 in Paris in summer time.
    expect(dayPartOf(new Date('2026-07-01T07:30:00Z'), 'Europe/Paris')).toBe('morning');
    expect(dayPartOf(new Date('2026-07-01T10:30:00Z'), 'Europe/Paris')).toBe('midday');
    expect(dayPartOf(new Date('2026-07-01T14:00:00Z'), 'Europe/Paris')).toBe('afternoon');
    expect(dayPartOf(new Date('2026-07-01T19:00:00Z'), 'Europe/Paris')).toBe('evening');
    expect(dayPartOf(new Date('2026-07-01T22:30:00Z'), 'Europe/Paris')).toBe('night');
    expect(dayPartOf(new Date('2026-07-01T22:30:00Z'), 'America/New_York')).toBe('evening');
  });

  it('suits a brunch in the morning and a bar in the evening', () => {
    expect(timeMatchOf(momentsOf('bakery'), 'morning')).toBe(1);
    expect(timeMatchOf(momentsOf('bakery'), 'evening')).toBe(0);
    expect(timeMatchOf(momentsOf('bar'), 'evening')).toBe(1);
    expect(timeMatchOf(momentsOf('bar'), 'morning')).toBe(0);
  });

  it('knows nothing of a route without a telling first step', () => {
    expect(timeMatchOf(momentsOf('other'), 'morning')).toBeNull();
    expect(timeMatchOf(momentsOf(null), 'evening')).toBeNull();
  });

  it('averages the known signals, and is neutral without any, the weather waiting for #31', () => {
    expect(contextOf({ timeMatch: 1, weatherMatch: null })).toBe(1);
    expect(contextOf({ timeMatch: 0, weatherMatch: null })).toBe(0);
    expect(contextOf({ timeMatch: 1, weatherMatch: 0 })).toBe(0.5);
    expect(contextOf({ timeMatch: null, weatherMatch: null })).toBe(0.5);
  });
});

describe('official', () => {
  it('is 1 for a route « Par Widoo », 0 otherwise', () => {
    expect(officialOf(true)).toBe(1);
    expect(officialOf(false)).toBe(0);
  });
});
