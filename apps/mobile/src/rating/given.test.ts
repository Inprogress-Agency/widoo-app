import { describe, expect, it } from 'vitest';
import { plannedFixture } from '../go/testPlanned';
import { bodyOf, isRatingChanged } from './given';

const at = '2026-10-24T14:50:00.000Z';
const rated = {
  ...plannedFixture(),
  myRating: { rating: 4, comment: 'Bien', createdAt: at, updatedAt: at },
};

describe('the rating given on E-15', () => {
  it('sends a blank comment as none', () => {
    expect(bodyOf({ rating: 3, comment: '   ' })).toEqual({ rating: 3, comment: null });
    expect(bodyOf({ rating: 3, comment: ' Joli ' })).toEqual({ rating: 3, comment: 'Joli' });
  });

  it('sends nothing without a rating, nor when the rating is unchanged', () => {
    expect(isRatingChanged(plannedFixture(), null)).toBe(false);
    expect(isRatingChanged(plannedFixture(), { rating: 5, comment: '' })).toBe(true);
    expect(isRatingChanged(rated, { rating: 4, comment: 'Bien ' })).toBe(false);
    expect(isRatingChanged(rated, { rating: 4, comment: '' })).toBe(true);
    expect(isRatingChanged(rated, { rating: 2, comment: 'Bien' })).toBe(true);
  });
});
