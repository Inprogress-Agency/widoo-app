import { describe, expect, it } from 'vitest';
import { parseListQuery, serializeListQuery, toggledSort } from './list-query';

const options = {
  filters: ['statut', 'ville'],
  sortableColumns: ['compte', 'recu'],
  defaultSort: { column: 'recu', direction: 'desc' },
} as const;

const parse = (address: string) => parseListQuery(new URLSearchParams(address), options);

describe('parseListQuery', () => {
  it('gives the default list for an empty address', () => {
    expect(parse('')).toEqual({
      search: '',
      filters: {},
      sort: { column: 'recu', direction: 'desc' },
      cursor: null,
    });
  });

  it('reads the search, the filters, the sort and the page', () => {
    expect(parse('q=consulat&statut=pending&tri=compte&page=abc')).toEqual({
      search: 'consulat',
      filters: { statut: 'pending' },
      sort: { column: 'compte', direction: 'asc' },
      cursor: 'abc',
    });
  });

  it('reads a descending sort', () => {
    expect(parse('tri=-compte').sort).toEqual({ column: 'compte', direction: 'desc' });
  });

  it('drops what the list does not know', () => {
    const query = parse('role=admin&tri=motdepasse&statut=');
    expect(query.filters).toEqual({});
    expect(query.sort).toEqual(options.defaultSort);
  });
});

describe('serializeListQuery', () => {
  it('writes nothing for the default list', () => {
    expect(serializeListQuery(parse(''), options)).toBe('');
  });

  it('gives back the address it was read from', () => {
    const address = 'q=consulat&statut=pending&ville=paris&tri=compte&page=abc';
    expect(serializeListQuery(parse(address), options)).toBe(address);
  });
});

describe('toggledSort', () => {
  it('reverses the sorted column', () => {
    expect(toggledSort({ column: 'recu', direction: 'asc' }, 'recu').direction).toBe('desc');
    expect(toggledSort({ column: 'recu', direction: 'desc' }, 'recu').direction).toBe('asc');
  });

  it('sorts another column from the first to the last', () => {
    expect(toggledSort({ column: 'recu', direction: 'desc' }, 'compte')).toEqual({
      column: 'compte',
      direction: 'asc',
    });
  });
});
