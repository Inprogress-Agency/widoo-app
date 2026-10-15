import { describe, expect, it } from 'vitest';
import { reasonFilterValues, toReportsParams } from './reports-list';

const base = { search: '', sort: { column: 'signale', direction: 'asc' }, cursor: null } as const;

describe('toReportsParams', () => {
  it('asks for every open report without a filter', () => {
    expect(toReportsParams({ ...base, filters: {} })).toEqual({
      reason: undefined,
      cursor: undefined,
    });
  });

  it('turns a reason of the address into the reason of the API, and the page', () => {
    expect(toReportsParams({ ...base, filters: { motif: 'note-basse' }, cursor: 'NTA' })).toEqual({
      reason: 'low_rating',
      cursor: 'NTA',
    });
  });

  it('drops a reason it does not know', () => {
    expect(toReportsParams({ ...base, filters: { motif: 'constructor' } }).reason).toBeUndefined();
  });

  it('covers every reason of a report', () => {
    expect(Object.values(reasonFilterValues).sort()).toEqual([
      'copied_content',
      'dangerous_place',
      'false_info',
      'hidden_ad',
      'inappropriate',
      'low_rating',
      'other',
      'place_changed',
    ]);
  });
});
