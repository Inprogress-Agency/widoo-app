import { describe, expect, it } from 'vitest';
import { toSupportParams } from './support-list';

const base = { search: '', sort: { column: 'date', direction: 'asc' }, cursor: null } as const;

describe('toSupportParams', () => {
  it('asks for every message without a filter', () => {
    expect(toSupportParams({ ...base, filters: {} })).toEqual({
      status: undefined,
      cursor: undefined,
    });
  });

  it('reads the status and the page', () => {
    expect(toSupportParams({ ...base, filters: { statut: 'unhandled' }, cursor: 'NTA' })).toEqual({
      status: 'unhandled',
      cursor: 'NTA',
    });
  });

  it('drops a status it does not know', () => {
    expect(toSupportParams({ ...base, filters: { statut: 'answered' } }).status).toBeUndefined();
  });
});
