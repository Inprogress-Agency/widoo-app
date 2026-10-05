import type { DehydratedState } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { persistedQuerySchema } from './search-cache';

type DehydratedQuery = DehydratedState['queries'][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The envelope the persister writes, before its queries are read. */
function isPersistedClient(value: unknown): value is PersistedClient {
  return (
    isRecord(value) &&
    isRecord(value.clientState) &&
    Array.isArray(value.clientState.queries) &&
    Array.isArray(value.clientState.mutations)
  );
}

/**
 * A query kept on the device, as the current schema of its answer reads it; null when its answer
 * no longer parses (a shape of an older API), or no schema reads it back.
 */
function readQuery(query: unknown): DehydratedQuery | null {
  if (!isRecord(query) || !Array.isArray(query.queryKey) || !isRecord(query.state)) {
    return null;
  }
  const schema = persistedQuerySchema(query.queryKey);
  if (!schema || query.state.status !== 'success') {
    return null;
  }
  const parsed = schema.safeParse(query.state.data);
  if (!parsed.success) {
    return null;
  }
  const read = query as unknown as DehydratedQuery;
  return { ...read, state: { ...read.state, data: parsed.data } };
}

/**
 * The cache kept on the device, as the app may show it: each query is checked against the schema
 * its answer from the network is checked against, and any query that fails is left out. A card
 * of an older shape, a Premium one without `isLocked` above all, is thus never shown (D-075).
 * `dropped` counts the queries left out; null when the envelope itself no longer reads.
 */
export function readPersistedClient(
  stored: unknown,
): { client: PersistedClient; dropped: number } | null {
  if (!isPersistedClient(stored)) {
    return null;
  }
  const queries = stored.clientState.queries.map(readQuery);
  const kept = queries.filter((query) => query !== null);
  return {
    client: { ...stored, clientState: { ...stored.clientState, queries: kept } },
    dropped: queries.length - kept.length,
  };
}

/**
 * The persister, whose restore hands the app only what the current schemas read: the queries
 * that fail are removed from the device as well, and an unreadable cache is removed whole. The
 * app then starts as without cache: the network, or « Pas de connexion » offline.
 */
export function validatingPersister(persister: Persister): Persister {
  return {
    ...persister,
    restoreClient: async () => {
      let stored: unknown;
      try {
        stored = await persister.restoreClient();
      } catch {
        // A cache that no longer deserializes.
        stored = null;
      }
      if (stored === undefined) {
        return undefined;
      }
      const read = readPersistedClient(stored);
      const isEmpty =
        !read ||
        (read.client.clientState.queries.length === 0 &&
          read.client.clientState.mutations.length === 0);
      if (isEmpty) {
        await persister.removeClient();
        return undefined;
      }
      if (read.dropped > 0) {
        await persister.persistClient(read.client);
      }
      return read.client;
    },
  };
}
