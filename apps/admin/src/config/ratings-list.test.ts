import { describe, expect, it } from 'vitest';
import { toRatingsParams } from './ratings-list';

const base = { search: '', sort: { column: 'date', direction: 'desc' }, cursor: null } as const;

describe('toRatingsParams', () => {
  it('asks for every rating without a filter', () => {
    expect(toRatingsParams({ ...base, filters: {} })).toEqual({
      rating: undefined,
      routeId: undefined,
      cursor: undefined,
    });
  });

  it('reads the note and the page', () => {
    expect(toRatingsParams({ ...base, filters: { note: '2' }, cursor: 'NTA' })).toEqual({
      rating: 2,
      routeId: undefined,
      cursor: 'NTA',
    });
  });

  it('drops a note outside 1 to 5', () => {
    expect(toRatingsParams({ ...base, filters: { note: '9' } }).rating).toBeUndefined();
    expect(toRatingsParams({ ...base, filters: { note: 'x' } }).rating).toBeUndefined();
  });

  it('reads the route, and drops one that is not an identifier', () => {
    const routeId = '0198c1de-0000-7000-8000-000000000001';
    expect(toRatingsParams({ ...base, filters: { parcours: routeId } }).routeId).toBe(routeId);
    expect(toRatingsParams({ ...base, filters: { parcours: 'x' } }).routeId).toBeUndefined();
  });
});
