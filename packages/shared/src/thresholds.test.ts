import { describe, expect, it } from 'vitest';
import {
  BucketThresholds,
  budgetBucketOf,
  defaultBucketThresholds,
  durationBucketOf,
} from './thresholds';

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

describe('durationBucketOf', () => {
  it.each([
    [60, '1_2h'],
    [150, '1_2h'],
    [151, 'half_day'],
    [300, 'half_day'],
    [301, 'full_day'],
    [720, 'full_day'],
    [721, 'weekend'],
  ] as const)('puts %i min in %s', (minutes, bucket) => {
    expect(durationBucketOf(minutes)).toBe(bucket);
  });

  it('follows thresholds read from settings', () => {
    const thresholds = {
      ...defaultBucketThresholds,
      durationMin: { '1_2h': 120, half_day: 240, full_day: 600 },
    };
    expect(durationBucketOf(150, thresholds)).toBe('half_day');
  });
});

describe('budgetBucketOf', () => {
  it.each([
    [0, 'free'],
    [0.5, 'low'],
    [25, 'low'],
    [25.5, 'medium'],
    [70, 'medium'],
    [71, 'high'],
  ] as const)('puts %d € in %s', (euros, bucket) => {
    expect(budgetBucketOf(euros)).toBe(bucket);
  });

  it('follows thresholds read from settings', () => {
    const thresholds = { ...defaultBucketThresholds, budgetEur: { free: 0, low: 15, medium: 50 } };
    expect(budgetBucketOf(20, thresholds)).toBe('medium');
  });
});
