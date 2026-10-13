import { parseListQuery } from '@/lib/list-query';
import { describe, expect, it } from 'vitest';
import { catalogRoutesListOptions, toCatalogRoutesParams } from './catalog-routes-list';

const paramsOf = (address: string) =>
  toCatalogRoutesParams(parseListQuery(new URLSearchParams(address), catalogRoutesListOptions));

describe('toCatalogRoutesParams', () => {
  it('asks for the last changed first by default', () => {
    expect(paramsOf('')).toEqual({
      q: undefined,
      status: undefined,
      access: undefined,
      sort: 'updated',
      direction: 'desc',
      cursor: undefined,
    });
  });

  it('translates the filters, the search, the sort and the page of the address', () => {
    expect(paramsOf('q=marais&statut=retire&acces=premium&tri=note&page=NTA')).toEqual({
      q: 'marais',
      status: 'unpublished',
      access: 'premium',
      sort: 'rating',
      direction: 'asc',
      cursor: 'NTA',
    });
  });

  it('drops a filter value it does not know, even the name of an object property', () => {
    expect(paramsOf('statut=online&acces=toString')).toMatchObject({
      status: undefined,
      access: undefined,
    });
  });
});
