import type { GeocodeZone, RouteCard } from '@widoo/shared';

/** The API refuses a shorter text: below it, the search shows the recent zones. */
export const MIN_SEARCH_LENGTH = 2;

/** Ecrans › E-02, saisie: the requests leave 300 ms after the last key. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Ecrans › E-02, chargement: past 5 s without answer, a group is in error. */
export const SEARCH_TIMEOUT_MS = 5000;

/** One of the two groups of the search, as its request stands. */
export interface Group<T> {
  status: 'pending' | 'success' | 'error';
  /** The last answer, kept while the next text loads; undefined before any. */
  data: T | undefined;
  isFetching: boolean;
}

export interface TextSearchInput {
  /** The text in the field, trimmed. */
  text: string;
  /** The text the requests were sent for, once the typing paused. */
  settled: string;
  isOnline: boolean;
  zones: Group<readonly GeocodeZone[]>;
  routes: Group<readonly RouteCard[]>;
}

/**
 * What the search shows (Ecrans › E-02): the recent zones under two characters, and until the
 * first results come; offline, only the line that says so; both groups failed, the message of
 * the total error; nothing found, the empty message; otherwise the groups, each with its own
 * state, the earlier results staying while the next ones load.
 */
export type TextSearchView =
  | { kind: 'recent'; isLoading: boolean }
  | { kind: 'offline' }
  | { kind: 'failed' }
  | { kind: 'empty' }
  | { kind: 'results'; isLoading: boolean };

export function textSearchView({
  text,
  settled,
  isOnline,
  zones,
  routes,
}: TextSearchInput): TextSearchView {
  if (text.length < MIN_SEARCH_LENGTH) {
    return { kind: 'recent', isLoading: false };
  }
  if (!isOnline) {
    return { kind: 'offline' };
  }
  const isLoading = text !== settled || zones.isFetching || routes.isFetching;
  if (zones.status === 'error' && routes.status === 'error' && !isLoading) {
    return { kind: 'failed' };
  }
  if (zones.data === undefined && routes.data === undefined) {
    return { kind: 'recent', isLoading: true };
  }
  const isEmpty =
    zones.status === 'success' &&
    routes.status === 'success' &&
    zones.data?.length === 0 &&
    routes.data?.length === 0;
  return isEmpty && !isLoading ? { kind: 'empty' } : { kind: 'results', isLoading };
}

/** « 2 zones, 3 parcours » for screen readers, once the groups answered; null while loading. */
export function resultCounts(input: TextSearchInput): { zones: number; routes: number } | null {
  const view = textSearchView(input);
  if (view.kind !== 'results' && view.kind !== 'empty') {
    return null;
  }
  if (view.kind === 'results' && view.isLoading) {
    return null;
  }
  return { zones: input.zones.data?.length ?? 0, routes: input.routes.data?.length ?? 0 };
}
