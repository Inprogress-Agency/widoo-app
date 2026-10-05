import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { RouteSearchResult } from '@widoo/shared';
import type { CachedResults } from '../discovery/store';

/** What reads back a query kept on the device: a schema of `@widoo/shared`. */
export interface PersistedQuerySchema {
  safeParse(data: unknown): { success: boolean; data?: unknown };
}

/** Key prefix of the zone searches: `['routes', 'search', bbox, filters]`. */
export const searchQueryKey = ['routes', 'search'] as const;

/** Results older than a week are not shown offline, and not kept. */
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isSearchKey = (queryKey: QueryKey) =>
  queryKey[0] === searchQueryKey[0] && queryKey[1] === searchQueryKey[1];

const isSearch = (query: Query) => isSearchKey(query.queryKey);

/**
 * The schema a query kept on the device is read back with, the one its answer from the network
 * is checked against; null for a query the persister never writes, which is then not read back.
 */
export function persistedQuerySchema(queryKey: QueryKey): PersistedQuerySchema | null {
  return isSearchKey(queryKey) ? RouteSearchResult : null;
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
 * only). Any other query stays in memory.
 */
export function shouldPersistQuery(client: QueryClient, query: Query): boolean {
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
