import { describe, expect, it } from 'vitest';
import { ratingsQueryString, reportsQueryString, signalsQueryString } from './reports';

describe('reportsQueryString', () => {
  it('is empty for the whole list, and writes the reason and the page', () => {
    expect(reportsQueryString({})).toBe('');
    expect(reportsQueryString({ reason: 'low_rating', cursor: 'NTA' })).toBe(
      'reason=low_rating&cursor=NTA',
    );
  });
});

describe('signalsQueryString', () => {
  it('writes the page only', () => {
    expect(signalsQueryString({ cursor: 'NTA' })).toBe('cursor=NTA');
  });
});

describe('ratingsQueryString', () => {
  it('writes the note as a number and the route', () => {
    expect(ratingsQueryString({ rating: 2, routeId: '0198c1de-0000-7000-8000-000000000001' })).toBe(
      'rating=2&routeId=0198c1de-0000-7000-8000-000000000001',
    );
  });
});
