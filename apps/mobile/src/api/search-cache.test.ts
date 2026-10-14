import { QueryClient } from '@tanstack/react-query';
import type { RouteSearchResult } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { testMe } from '../test/me';
import {
  deviceCopy,
  latestCachedResults,
  OFFLINE_MAX_AGE_MS,
  persistedQuerySchema,
  shouldPersistQuery,
} from './search-cache';

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

  it('keeps on the device the last search answered, and no other search', () => {
    expect(shouldPersistQuery(client, queryOf(['routes', 'search', 'zone-b']))).toBe(true);
    expect(shouldPersistQuery(client, queryOf(['routes', 'search', 'zone-a']))).toBe(false);
    expect(shouldPersistQuery(client, queryOf(['me']))).toBe(false);
  });

  it('keeps the account of the user, read back with its schema (E-09, hors connexion)', () => {
    const withMe = clientWith([[['me', 'uid-1'], testMe(), 1_000]]);
    const query = withMe.getQueryCache().find({ queryKey: ['me', 'uid-1'], exact: true });
    expect(query && shouldPersistQuery(withMe, query)).toBe(true);
    expect(persistedQuerySchema(['me', 'uid-1'])?.safeParse(testMe()).success).toBe(true);
    expect(persistedQuerySchema(['me', 'uid-1'])?.safeParse({ id: 'x' }).success).toBe(false);
  });

  it('keeps the account on the device without its e-mail, and any other answer as it is', () => {
    expect(deviceCopy(['me', 'uid-1'], testMe())).toEqual(testMe({ email: null }));
    const withoutEmail = testMe({ email: null });
    expect(deviceCopy(['me', 'uid-1'], withoutEmail)).toBe(withoutEmail);
    const search = answer('a');
    expect(deviceCopy(['routes', 'search', 'zone-a'], search)).toBe(search);
    expect(deviceCopy(['me'], { email: 'x' })).toEqual({ email: 'x' });
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
