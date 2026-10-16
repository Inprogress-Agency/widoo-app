import { describe, expect, it } from 'vitest';
import { canRateOuting, isLowRating, minDoneStepsToRate } from './ratings';
import { RateRoute } from './schemas/rating';

const step = (state: 'done' | 'skipped' | 'none') => ({
  doneAt: state === 'done' ? '2026-10-24T10:20:00.000Z' : null,
  skippedAt: state === 'skipped' ? '2026-10-24T10:30:00.000Z' : null,
});

describe('minDoneStepsToRate', () => {
  it('asks half of the steps, rounded up', () => {
    expect([1, 2, 3, 4, 5, 10].map(minDoneStepsToRate)).toEqual([1, 1, 2, 2, 3, 5]);
  });
});

describe('canRateOuting', () => {
  it('opens the rating from half of the steps done, even when others were skipped', () => {
    const steps = [step('done'), step('done'), step('skipped'), step('skipped')];
    expect(canRateOuting({ status: 'completed', steps })).toBe(true);
  });

  it('keeps it closed under half, and for any status but completed', () => {
    const steps = [step('done'), step('skipped'), step('none'), step('none')];
    expect(canRateOuting({ status: 'completed', steps })).toBe(false);
    const all = [step('done'), step('done')];
    for (const status of ['stopped', 'in_progress', 'planned', 'cancelled', 'missed']) {
      expect(canRateOuting({ status, steps: all })).toBe(false);
    }
  });
});

describe('isLowRating', () => {
  it('flags an average under 2.5 with at least 5 ratings', () => {
    expect(isLowRating(2.4, 5)).toBe(true);
    expect(isLowRating(2.5, 9)).toBe(false);
    expect(isLowRating(1, 4)).toBe(false);
    expect(isLowRating(null, 0)).toBe(false);
  });
});

describe('RateRoute', () => {
  it('takes a rating from 1 to 5 and an optional comment of 280 characters', () => {
    expect(RateRoute.parse({ rating: 4 })).toEqual({ rating: 4 });
    expect(RateRoute.parse({ rating: 5, comment: '  Bien  ' })).toEqual({
      rating: 5,
      comment: 'Bien',
    });
    expect(RateRoute.parse({ rating: 5, comment: '' })).toEqual({ rating: 5, comment: null });
    expect(RateRoute.safeParse({ rating: 0 }).success).toBe(false);
    expect(RateRoute.safeParse({ rating: 3.5 }).success).toBe(false);
    expect(RateRoute.safeParse({ rating: 3, comment: 'a'.repeat(281) }).success).toBe(false);
    expect(RateRoute.safeParse({ rating: 3, comment: '<b>non</b>' }).success).toBe(false);
    expect(RateRoute.safeParse({ rating: 3, personalNote: 'x' }).success).toBe(false);
  });
});
