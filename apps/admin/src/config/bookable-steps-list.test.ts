import { describe, expect, it } from 'vitest';
import { toBookableStepsParams, type BookableStepsListQuery } from './bookable-steps-list';

const query = (
  filters: BookableStepsListQuery['filters'],
  cursor: string | null = null,
): BookableStepsListQuery => ({
  search: '',
  filters,
  sort: { column: 'clics', direction: 'desc' },
  cursor,
});

describe('toBookableStepsParams', () => {
  it('asks for the places without a partner link when the filter applies', () => {
    expect(toBookableStepsParams(query({ 'sans-partenaire': 'oui' }, 'abc'))).toEqual({
      withoutPartnerLink: 'true',
      cursor: 'abc',
    });
  });

  it('asks for everything otherwise, and ignores another value', () => {
    expect(toBookableStepsParams(query({}))).toEqual({
      withoutPartnerLink: undefined,
      cursor: undefined,
    });
    expect(
      toBookableStepsParams(query({ 'sans-partenaire': 'non' })).withoutPartnerLink,
    ).toBeUndefined();
  });
});
