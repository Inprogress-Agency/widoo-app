import { describe, expect, it } from 'vitest';
import { BucketThresholds, defaultBucketThresholds } from './thresholds';

describe('BucketThresholds', () => {
  it('accepts the defaults', () => {
    expect(BucketThresholds.parse(defaultBucketThresholds)).toEqual(defaultBucketThresholds);
  });

  it.each([
    ['bounds that do not increase', { budgetEur: { free: 0, low: 80, medium: 70 } }],
    ['a missing bucket', { durationMin: { '1_2h': 150, half_day: 300 } }],
    ['a negative bound', { budgetEur: { free: -1, low: 25, medium: 70 } }],
  ])('rejects %s', (_, override) => {
    expect(BucketThresholds.safeParse({ ...defaultBucketThresholds, ...override }).success).toBe(
      false,
    );
  });
});
