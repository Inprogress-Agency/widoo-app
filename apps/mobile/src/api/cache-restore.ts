import type { DehydratedState } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { deviceCopy, persistedQuerySchema } from './search-cache';

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

/** The query as the device keeps it (`deviceCopy`): the same object when nothing is left out. */
function copyOf(query: DehydratedQuery): DehydratedQuery {
  const data = deviceCopy(query.queryKey, query.state.data);
  return data === query.state.data ? query : { ...query, state: { ...query.state, data } };
}

/** The client as the device keeps it: each query through `deviceCopy`. */
export function deviceClient(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: { ...client.clientState, queries: client.clientState.queries.map(copyOf) },
  };
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
 * `dropped` counts the queries left out, `redacted` those that still held what the device no
 * longer keeps (an e-mail an older version wrote); null when the envelope itself no longer reads.
 */
export function readPersistedClient(
  stored: unknown,
): { client: PersistedClient; dropped: number; redacted: number } | null {
  if (!isPersistedClient(stored)) {
    return null;
  }
  const queries = stored.clientState.queries.map(readQuery);
  const read = queries.filter((query) => query !== null);
  const kept = read.map(copyOf);
  return {
    client: { ...stored, clientState: { ...stored.clientState, queries: kept } },
    dropped: queries.length - kept.length,
    redacted: kept.filter((query, index) => query !== read[index]).length,
  };
}

/**
 * The persister, which writes the device copy of each query (`deviceCopy`), and whose restore
 * hands the app only what the current schemas read: the queries that fail are removed from the
 * device as well, and an unreadable cache is removed whole. The app then starts as without
 * cache: the network, or « Pas de connexion » offline.
 */
export function validatingPersister(persister: Persister): Persister {
  return {
    ...persister,
    persistClient: (client) => persister.persistClient(deviceClient(client)),
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
      if (read.dropped > 0 || read.redacted > 0) {
        await persister.persistClient(read.client);
      }
      return read.client;
    },
  };
}
