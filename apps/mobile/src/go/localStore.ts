import { createStore } from 'zustand/vanilla';
import { emptyGoLocal, type GoLocal } from './progress';

/** Where the store keeps itself: MMKV in the app, a map in the tests. */
export interface GoLocalStorage {
  get(): string | undefined;
  set(value: string): void;
}

interface GoLocalState {
  /** The Go the phone keeps something of; one at a time (D-033). */
  plannedId: string | null;
  local: GoLocal;
}

function read(storage: GoLocalStorage): GoLocalState {
  try {
    const stored = JSON.parse(storage.get() ?? 'null') as Partial<GoLocalState> | null;
    if (
      stored &&
      typeof stored.plannedId === 'string' &&
      Array.isArray(stored.local?.arrivedStepIds) &&
      Array.isArray(stored.local.pendingDone)
    ) {
      return { plannedId: stored.plannedId, local: stored.local };
    }
  } catch {
    // An unreadable copy is dropped: the API still knows the steps done.
  }
  return { plannedId: null, local: emptyGoLocal };
}

/**
 * What the phone keeps of the Go under way (`GoLocal`), across launches: « J'y suis » and the
 * steps done offline. Another Go starts from nothing.
 */
export function createGoLocalStore(storage: GoLocalStorage) {
  const store = createStore<GoLocalState>(() => read(storage));
  store.subscribe((state) => storage.set(JSON.stringify(state)));

  const localOf = (plannedId: string): GoLocal => {
    const state = store.getState();
    return state.plannedId === plannedId ? state.local : emptyGoLocal;
  };
  const update = (plannedId: string, change: (local: GoLocal) => GoLocal) =>
    store.setState({ plannedId, local: change(localOf(plannedId)) });

  return {
    store,
    localOf,
    arrive: (plannedId: string, stepId: string) =>
      update(plannedId, (local) => ({
        ...local,
        arrivedStepIds: [...local.arrivedStepIds.filter((id) => id !== stepId), stepId],
      })),
    queueDone: (plannedId: string, stepId: string, at: Date) =>
      update(plannedId, (local) => ({
        ...local,
        pendingDone: [
          ...local.pendingDone.filter((entry) => entry.stepId !== stepId),
          { stepId, at: at.toISOString() },
        ],
      })),
    /** A step the API took: no longer pending. */
    sent: (plannedId: string, stepId: string) =>
      update(plannedId, (local) => ({
        ...local,
        pendingDone: local.pendingDone.filter((entry) => entry.stepId !== stepId),
      })),
    clear: () => store.setState({ plannedId: null, local: emptyGoLocal }),
  };
}

export type GoLocalStore = ReturnType<typeof createGoLocalStore>;
