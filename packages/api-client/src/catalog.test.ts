import { describe, expect, it } from 'vitest';
import { catalogPlacesQueryString, catalogQueryString } from './catalog';

describe('catalogQueryString', () => {
  it('is empty for the default list', () => {
    expect(catalogQueryString({})).toBe('');
  });

  it('writes the search, the filters, the sort and the page', () => {
    expect(
      catalogQueryString({
        q: 'marais',
        status: 'unpublished',
        access: 'premium',
        sort: 'rating',
        direction: 'asc',
        cursor: 'NTA',
      }),
    ).toBe('q=marais&status=unpublished&access=premium&sort=rating&direction=asc&cursor=NTA');
  });
});

describe('catalogPlacesQueryString', () => {
  it('writes the search, the filters and the sort of the places', () => {
    expect(catalogPlacesQueryString({ q: 'café', category: 'cafe', status: 'stale' })).toBe(
      'q=caf%C3%A9&category=cafe&status=stale',
    );
  });
});
