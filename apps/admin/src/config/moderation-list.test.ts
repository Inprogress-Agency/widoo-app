import { parseListQuery } from '@/lib/list-query';
import { describe, expect, it } from 'vitest';
import { moderationListOptions, toModerationQueueParams } from './moderation-list';

const paramsOf = (address: string) =>
  toModerationQueueParams(parseListQuery(new URLSearchParams(address), moderationListOptions));

describe('toModerationQueueParams', () => {
  it('asks for the oldest first by default', () => {
    expect(paramsOf('')).toEqual({
      status: undefined,
      city: undefined,
      late: undefined,
      revision: undefined,
      q: undefined,
      sort: 'waiting',
      direction: 'asc',
      cursor: undefined,
    });
  });

  it('translates the filters, the search, the sort and the page of the address', () => {
    expect(
      paramsOf(
        'statut=modifications&ville=0199d0a2-7c1e-7000-8000-000000000001&retard=oui&revision=oui&q=marais&tri=-auteur&page=NTA',
      ),
    ).toEqual({
      status: 'changes_requested',
      city: '0199d0a2-7c1e-7000-8000-000000000001',
      late: 'true',
      revision: 'true',
      q: 'marais',
      sort: 'author',
      direction: 'desc',
      cursor: 'NTA',
    });
  });

  it('drops a filter value it does not know', () => {
    expect(paramsOf('statut=published&retard=non&ville=paris')).toMatchObject({
      status: undefined,
      city: undefined,
      late: undefined,
    });
  });
});
