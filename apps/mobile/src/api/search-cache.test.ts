import { QueryClient } from '@tanstack/react-query';
import type { RouteSearchResult } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { latestCachedResults, OFFLINE_MAX_AGE_MS, shouldPersistQuery } from './search-cache';

const answer = (cursor: string): RouteSearchResult => ({
  items: [],
  nextCursor: cursor,
  clusters: null,
});

function clientWith(entries: [key: unknown[], data: unknown, at: number][]) {
  const client = new QueryClient();
  for (const [key, data, at] of entries) {
    client.setQueryData(key, data, { updatedAt: at });
  }
  return client;
}

describe('search cache', () => {
  const client = clientWith([
    [['routes', 'search', 'zone-a'], answer('a'), 1_000],
    [['routes', 'search', 'zone-b'], answer('b'), 3_000],
    [['me'], { id: 'someone' }, 5_000],
  ]);
  const queryOf = (key: unknown[]) => {
    const query = client.getQueryCache().find({ queryKey: key, exact: true });
    if (!query) throw new Error('No query');
    return query;
  };

  it('keeps on the device the last search answered, and nothing else', () => {
    expect(shouldPersistQuery(client, queryOf(['routes', 'search', 'zone-b']))).toBe(true);
    expect(shouldPersistQuery(client, queryOf(['routes', 'search', 'zone-a']))).toBe(false);
    expect(shouldPersistQuery(client, queryOf(['me']))).toBe(false);
  });

  it('gives the last results with the time they were fetched', () => {
    expect(latestCachedResults(client, 4_000)).toEqual({ result: answer('b'), fetchedAt: 3_000 });
  });

  it('gives nothing too old, unreadable, or without search', () => {
    expect(latestCachedResults(client, 3_000 + OFFLINE_MAX_AGE_MS + 1)).toBeNull();
    expect(
      latestCachedResults(clientWith([[['routes', 'search', 'x'], { bad: 1 }, 1]]), 2),
    ).toBeNull();
    expect(latestCachedResults(new QueryClient())).toBeNull();
  });
});
