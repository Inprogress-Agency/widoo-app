import { describe, expect, it } from 'vitest';
import { catalogQueryString } from './catalog';

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
