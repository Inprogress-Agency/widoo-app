import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchQueryKey } from '../api/search-cache';
import { resetRightsDependentQueries, signOutOnDeletedAccount } from './rights';

const searchKey = [...searchQueryKey, { west: 2.35, south: 48.86, east: 2.37, north: 48.87 }, {}];
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  client.clear();
});

describe('rights-dependent queries', () => {
  it('empties the search results and the sheets, and keeps the rest', async () => {
    client.setQueryData(searchKey, { items: ['premium card unlocked'] });
    client.setQueryData(['routes', 'route-1', null], { title: 'Montmartre' });
    client.setQueryData(['geocode', 'mont'], ['Montmartre']);
    await resetRightsDependentQueries(client);
    expect(client.getQueryData(searchKey)).toBeUndefined();
    expect(client.getQueryData(['routes', 'route-1', null])).toBeUndefined();
    expect(client.getQueryData(['geocode', 'mont'])).toEqual(['Montmartre']);
  });

  it('asks the API again for the search on screen', async () => {
    const queryFn = vi.fn(async () => ({ items: [] }));
    // The search on screen: an observer, as `useQuery` is, its answer fresh.
    const observer = new QueryObserver(client, { queryKey: searchKey, queryFn, staleTime: 30_000 });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    await resetRightsDependentQueries(client);
    expect(queryFn).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe('deleted account', () => {
  const failWith = (error: Error) =>
    client
      .fetchQuery({
        queryKey: ['me'],
        queryFn: () => Promise.reject(error),
      })
      .catch(() => undefined);

  it('signs out on the 401 of a deleted account only', async () => {
    const signOut = vi.fn(async () => undefined);
    const unsubscribe = signOutOnDeletedAccount(client, signOut);
    await failWith(
      new ApiRequestError('http', 401, { code: 'unauthorized', message: 'Invalid token' }),
    );
    expect(signOut).not.toHaveBeenCalled();
    await failWith(
      new ApiRequestError('http', 401, { code: 'unauthorized', message: 'Account deleted' }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
