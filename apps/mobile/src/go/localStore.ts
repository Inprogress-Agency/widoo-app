import { createStore } from 'zustand/vanilla';
import { emptyGoLocal, type GoLocal, type GoPendingAction, type GoStepAction } from './progress';

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

/** What the version of #42 kept: « J'y suis » on the phone only, and the steps done offline. */
interface LegacyGoLocal {
  arrivedStepIds: unknown;
  pendingDone: unknown;
}

const isLegacy = (local: unknown): local is LegacyGoLocal =>
  typeof local === 'object' &&
  local !== null &&
  Array.isArray((local as LegacyGoLocal).arrivedStepIds) &&
  Array.isArray((local as LegacyGoLocal).pendingDone);

/**
 * The arrivals the version of #42 kept on the phone become actions to send, then forgotten once
 * the API has them; its steps done offline too, after them.
 */
function fromLegacy(legacy: LegacyGoLocal, now: Date): GoLocal {
  const arrived = (legacy.arrivedStepIds as unknown[])
    .filter((stepId): stepId is string => typeof stepId === 'string')
    .map((stepId): GoPendingAction => ({ action: 'arrived', stepId, at: now.toISOString() }));
  const done = (legacy.pendingDone as { stepId?: unknown; at?: unknown }[])
    .filter((entry) => typeof entry?.stepId === 'string' && typeof entry.at === 'string')
    .map((entry): GoPendingAction => ({
      action: 'done',
      stepId: entry.stepId as string,
      at: entry.at as string,
    }));
  return { pending: [...arrived, ...done] };
}

function read(storage: GoLocalStorage, now: Date): GoLocalState {
  try {
    const stored = JSON.parse(storage.get() ?? 'null') as Partial<GoLocalState> | null;
    if (stored && typeof stored.plannedId === 'string') {
      if (Array.isArray(stored.local?.pending)) {
        return { plannedId: stored.plannedId, local: stored.local };
      }
      if (isLegacy(stored.local)) {
        return { plannedId: stored.plannedId, local: fromLegacy(stored.local, now) };
      }
    }
  } catch {
    // An unreadable copy is dropped: the API still knows what it took.
  }
  return { plannedId: null, local: emptyGoLocal };
}

/** « Passer » and « Annuler » undo one another while neither is sent. */
const oppositeOf: Partial<Record<GoStepAction, GoStepAction>> = { skip: 'unskip', unskip: 'skip' };

const isSame = (entry: GoPendingAction, action: GoStepAction, stepId: string) =>
  entry.action === action && entry.stepId === stepId;

/**
 * What the phone keeps of the Go under way (`GoLocal`), across launches: the actions of its steps
 * not sent yet, in the order they were taken. Another Go starts from nothing.
 */
export function createGoLocalStore(storage: GoLocalStorage, now = () => new Date()) {
  const store = createStore<GoLocalState>(() => read(storage, now()));
  store.subscribe((state) => storage.set(JSON.stringify(state)));

  const localOf = (plannedId: string): GoLocal => {
    const state = store.getState();
    return state.plannedId === plannedId ? state.local : emptyGoLocal;
  };
  const update = (
    plannedId: string,
    change: (pending: readonly GoPendingAction[]) => GoPendingAction[],
  ) => store.setState({ plannedId, local: { pending: change(localOf(plannedId).pending) } });

  return {
    store,
    localOf,
    /** An action kept for the network: once per step, a « Passer » and its « Annuler » cancelled. */
    queue: (plannedId: string, action: GoStepAction, stepId: string, at: Date) =>
      update(plannedId, (pending) => {
        const opposite = oppositeOf[action];
        if (opposite && pending.some((entry) => isSame(entry, opposite, stepId))) {
          return pending.filter((entry) => !isSame(entry, opposite, stepId));
        }
        if (pending.some((entry) => isSame(entry, action, stepId))) {
          return [...pending];
        }
        return [...pending, { action, stepId, at: at.toISOString() }];
      }),
    /** An action the API took, or refused: no longer pending. */
    sent: (plannedId: string, { action, stepId }: Pick<GoPendingAction, 'action' | 'stepId'>) =>
      update(plannedId, (pending) => pending.filter((entry) => !isSame(entry, action, stepId))),
    clear: () => store.setState({ plannedId: null, local: emptyGoLocal }),
  };
}

export type GoLocalStore = ReturnType<typeof createGoLocalStore>;
