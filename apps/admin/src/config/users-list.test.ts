import { describe, expect, it } from 'vitest';
import { toUsersParams } from './users-list';

const query = {
  search: '',
  filters: {},
  sort: { column: 'inscription', direction: 'desc' },
  cursor: null,
} as const;

describe('toUsersParams', () => {
  it('asks for the search and the page of the address', () => {
    expect(toUsersParams({ ...query, search: 'léa', cursor: 'abc' })).toEqual({
      q: 'léa',
      cursor: 'abc',
    });
  });

  it('leaves out an empty search and the first page', () => {
    expect(toUsersParams(query)).toEqual({ q: undefined, cursor: undefined });
  });
});
