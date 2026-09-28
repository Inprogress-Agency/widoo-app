import { describe, expect, it } from 'vitest';
import { stableComponentsOf, stableRecommendationOf, StoredRecommendation } from './stable';

const now = new Date('2026-09-28T02:00:00Z');

describe('stable components', () => {
  it('degrade to neutral values without ratings or verification (launch)', () => {
    const stored = stableRecommendationOf(
      {
        isOfficial: false,
        rating: { average: null, count: 0 },
        publishedAt: null,
        computedAt: null,
        placeStatuses: ['stale', 'stale', 'stale'],
        firstCategory: 'other',
      },
      { now, priorMean: 4.1 },
    );
    expect(stored).toEqual({
      quality: 0.5,
      rated: false,
      reliability: 0.5,
      freshness: 0.5,
      official: 0,
      moments: [],
      computed_at: now.toISOString(),
    });
    expect(StoredRecommendation.parse(stored)).toEqual(stored);
  });

  it('are computed from the ratings, the places, the dates and the first step', () => {
    const stored = stableRecommendationOf(
      {
        isOfficial: true,
        rating: { average: 4.5, count: 15 },
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        computedAt: new Date('2026-09-20T00:00:00Z'),
        placeStatuses: ['verified', 'verified'],
        firstCategory: 'bakery',
      },
      { now, priorMean: 3.5 },
    );
    expect(stored).toMatchObject({
      rated: true,
      reliability: 1,
      freshness: 1,
      official: 1,
      moments: ['morning', 'midday'],
    });
    // (5 × 3.5 + 15 × 4.5) / 20 = 4.25.
    expect(stored.quality).toBeCloseTo((4.25 - 1) / 4);
  });

  it('are read from routes.recommendation when the job has computed them', () => {
    const stored = {
      quality: 0.8,
      rated: true,
      reliability: 1,
      freshness: 0.2,
      official: 0,
      moments: ['evening'],
      computed_at: now.toISOString(),
    };
    const row = { isOfficial: true, rating: { average: null, count: 0 }, publishedAt: now };
    expect(stableComponentsOf(stored, row, now)).toEqual(stored);
  });

  it('are derived from the row of a route the job has not reached yet', () => {
    const row = { isOfficial: true, rating: { average: 5, count: 5 }, publishedAt: now };
    expect(stableComponentsOf(null, row, now)).toEqual({
      quality: 0.75,
      rated: true,
      reliability: 0.5,
      freshness: 1,
      official: 1,
      moments: [],
    });
    expect(stableComponentsOf({ quality: 'high' }, row, now).reliability).toBe(0.5);
  });
});
