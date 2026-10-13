import { parseListQuery } from '@/lib/list-query';
import { describe, expect, it } from 'vitest';
import { catalogPlacesListOptions, toCatalogPlacesParams } from './catalog-places-list';

const paramsOf = (address: string) =>
  toCatalogPlacesParams(parseListQuery(new URLSearchParams(address), catalogPlacesListOptions));

describe('toCatalogPlacesParams', () => {
  it('asks for the places by name by default', () => {
    expect(paramsOf('')).toMatchObject({ sort: 'name', direction: 'asc', category: undefined });
  });

  it('translates the filters, the search and the sort of the address', () => {
    expect(paramsOf('q=martyrs&categorie=cafe&statut=a-verifier&tri=-parcours')).toMatchObject({
      q: 'martyrs',
      category: 'cafe',
      status: 'stale',
      sort: 'routes',
      direction: 'desc',
    });
  });

  it('drops a filter value it does not know', () => {
    expect(paramsOf('categorie=casino&statut=toString')).toMatchObject({
      category: undefined,
      status: undefined,
    });
  });
});
