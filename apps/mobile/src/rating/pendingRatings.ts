import { RateRoute } from '@widoo/shared';
import { createStore } from 'zustand/vanilla';

/** Where the store keeps itself: MMKV in the app, a map in the tests. */
export interface PendingRatingStorage {
  get(): string | undefined;
  set(value: string): void;
}

/** A rating given offline on E-15, sent at the return of the network (Ecrans › E-15). */
export interface PendingRating {
  plannedId: string;
  body: RateRoute;
}

/** An entry read back, checked by the schema of the API: anything else is dropped. */
function entryOf(value: unknown): PendingRating[] {
  if (typeof value !== 'object' || value === null || !('plannedId' in value)) {
    return [];
  }
  const { plannedId } = value;
  const body = RateRoute.safeParse('body' in value ? value.body : undefined);
  return typeof plannedId === 'string' && body.success ? [{ plannedId, body: body.data }] : [];
}

function read(storage: PendingRatingStorage): PendingRating[] {
  try {
    const stored: unknown = JSON.parse(storage.get() ?? '[]');
    return Array.isArray(stored) ? stored.flatMap(entryOf) : [];
  } catch {
    // An unreadable copy is dropped: nothing to send.
    return [];
  }
}

/**
 * The ratings waiting for the network, across launches: one per outing, the last one given
 * replacing an earlier one.
 */
export function createPendingRatingStore(storage: PendingRatingStorage) {
  const store = createStore<{ pending: PendingRating[] }>(() => ({ pending: read(storage) }));
  store.subscribe((state) => storage.set(JSON.stringify(state.pending)));
  const others = (plannedId: string) =>
    store.getState().pending.filter((entry) => entry.plannedId !== plannedId);
  return {
    store,
    pending: () => store.getState().pending,
    queue: (entry: PendingRating) =>
      store.setState({ pending: [...others(entry.plannedId), entry] }),
    /** Taken by the API, or refused for good: no longer pending. */
    sent: (plannedId: string) => store.setState({ pending: others(plannedId) }),
    clear: () => store.setState({ pending: [] }),
  };
}

export type PendingRatingStore = ReturnType<typeof createPendingRatingStore>;
