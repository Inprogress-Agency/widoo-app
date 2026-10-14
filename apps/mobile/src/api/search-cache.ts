import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { Me, RouteSearchResult } from '@widoo/shared';
import type { CachedResults } from '../discovery/store';

/** What reads back a query kept on the device: a schema of `@widoo/shared`. */
export interface PersistedQuerySchema {
  safeParse(data: unknown): { success: boolean; data?: unknown };
}

/** Key prefix of the zone searches: `['routes', 'search', bbox, filters]`. */
export const searchQueryKey = ['routes', 'search'] as const;

/** Results older than a week are not shown offline, and not kept. */
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Key prefix of the signed-in account, `['me', uid]`: kept on the device so that the profile shows
 * offline (Ecrans › E-09, hors connexion), forgotten at the sign-out.
 */
export const meQueryPrefix = ['me'] as const;

const isMeKey = (queryKey: QueryKey) => queryKey[0] === meQueryPrefix[0] && queryKey.length === 2;

const isSearchKey = (queryKey: QueryKey) =>
  queryKey[0] === searchQueryKey[0] && queryKey[1] === searchQueryKey[1];

const isSearch = (query: Query) => isSearchKey(query.queryKey);

/**
 * The schema a query kept on the device is read back with, the one its answer from the network
 * is checked against; null for a query the persister never writes, which is then not read back.
 */
export function persistedQuerySchema(queryKey: QueryKey): PersistedQuerySchema | null {
  if (isSearchKey(queryKey)) {
    return RouteSearchResult;
  }
  return isMeKey(queryKey) ? Me : null;
}

/** The last search answered, the only one kept on the device. */
function latestSearchQuery(client: QueryClient): Query | null {
  let latest: Query | null = null;
  for (const query of client.getQueryCache().findAll({ queryKey: searchQueryKey })) {
    if (
      query.state.status === 'success' &&
      query.state.dataUpdatedAt > (latest?.state.dataUpdatedAt ?? 0)
    ) {
      latest = query;
    }
  }
  return latest;
}

/**
 * What the persister writes: the last answered search, public data with no position (the zone
 * only), and the account of the user, on their own phone. Any other query stays in memory.
 */
export function shouldPersistQuery(client: QueryClient, query: Query): boolean {
  if (isMeKey(query.queryKey)) {
    return query.state.status === 'success';
  }
  return isSearch(query) && query === latestSearchQuery(client);
}

/**
 * The results of the last search answered, restored from the device at launch, for the sheet
 * offline (Ecrans › E-01, hors connexion); null when none is kept, or it no longer parses.
 */
export function latestCachedResults(client: QueryClient, now = Date.now()): CachedResults | null {
  const query = latestSearchQuery(client);
  if (!query || now - query.state.dataUpdatedAt > OFFLINE_MAX_AGE_MS) {
    return null;
  }
  const parsed = RouteSearchResult.safeParse(query.state.data);
  return parsed.success ? { result: parsed.data, fetchedAt: query.state.dataUpdatedAt } : null;
}
