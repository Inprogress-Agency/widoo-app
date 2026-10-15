import { describe, expect, it } from 'vitest';
import { toRatingsParams } from './ratings-list';

const base = { search: '', sort: { column: 'date', direction: 'desc' }, cursor: null } as const;

describe('toRatingsParams', () => {
  it('asks for every rating without a filter', () => {
    expect(toRatingsParams({ ...base, filters: {} })).toEqual({
      rating: undefined,
      cursor: undefined,
    });
  });

  it('reads the note and the page', () => {
    expect(toRatingsParams({ ...base, filters: { note: '2' }, cursor: 'NTA' })).toEqual({
      rating: 2,
      cursor: 'NTA',
    });
  });

  it('drops a note outside 1 to 5', () => {
    expect(toRatingsParams({ ...base, filters: { note: '9' } }).rating).toBeUndefined();
    expect(toRatingsParams({ ...base, filters: { note: 'x' } }).rating).toBeUndefined();
  });
});
