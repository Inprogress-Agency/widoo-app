import type { RouteSearchParams } from '@widoo/api-client';
import {
  routeFilterGroups,
  type AnalyticsEvents,
  type RouteCard,
  type RouteFilterGroup,
  type RouteSearchResult,
  type RouteSort,
} from '@widoo/shared';
import { createStore } from 'zustand/vanilla';
import { scaleBbox, type Bbox } from '../map/geo';
import { filterResults, removeGroup, toggleFilter, type Filter } from './filters';

/** What started a search, as `map_search_zone` reports it (wiki Analytics). */
export type SearchTrigger = AnalyticsEvents['map_search_zone']['trigger'];

/** What the map shows: its zone, and the zoom level it is seen at. */
export interface MapView {
  bbox: Bbox;
  zoom: number;
}

/** Active filters of the search (E-03, #29): a missing or empty group filters nothing. */
export type SearchFilters = Pick<RouteSearchParams, RouteFilterGroup>;

/** Where filters were changed from, as `filters_applied` reports it (wiki Analytics). */
export type FiltersSource = 'chip' | 'panel';

/** A search asked for; `id` tells its answer apart from the answer of an older search. */
export interface ZoneSearch {
  id: number;
  view: MapView;
  filters: SearchFilters;
  trigger: SearchTrigger;
  /** The filters were just changed by a chip or the panel: its answer sends `filters_applied`. */
  filtersSource: FiltersSource | null;
}

/** `offline`: the search waits for the network; the last results known stay on screen. */
export type SearchStatus = 'idle' | 'loading' | 'success' | 'error' | 'offline';

/** Results kept from an earlier session, with the time they were fetched. */
export interface CachedResults {
  result: RouteSearchResult;
  fetchedAt: number;
}

export interface DiscoveryState {
  /** Where the map has settled; null until its first view. */
  view: MapView | null;
  /** The user moved or zoomed the map since the last search: « Rechercher dans cette zone ». */
  hasMoved: boolean;
  /** The last search asked for, whose zone the results belong to. */
  search: ZoneSearch | null;
  status: SearchStatus;
  /**
   * The results on screen: the last answer received, which stays while the next search loads or
   * fails; offline, the last answer filtered on the device with the filters of the search.
   */
  results: RouteSearchResult | null;
  /** The last answer received, or kept from an earlier session: what offline filters start from. */
  answer: RouteSearchResult | null;
  /** When the results on screen were fetched: « résultats du 22 sept. à 14:02 » offline. */
  resultsAt: number | null;
  filters: SearchFilters;
  /** Filters being chosen in the panel (E-03), applied or dropped as a whole; null when closed. */
  draft: SearchFilters | null;
  selectedRouteId: string | null;
  /** The card the user scrolled to in the sheet: the map comes round to its start (E-04). */
  focusedRouteId: string | null;
  /** A view the app asks the map to show, such as the widened zone; `id` changes each time. */
  framing: { id: number; view: MapView } | null;
  /** Sort of the « Voir tout » lists, kept for the session (Ecrans › E-04, sheet de tri). */
  sort: RouteSort;
}

export interface DiscoveryActions {
  /** The map settled on `view`. Its first view starts the initial search; a manual move shows the button. */
  showView: (view: MapView, isManual: boolean) => void;
  /** Searches the zone on screen with the active filters. */
  searchZone: (trigger: SearchTrigger) => void;
  /** « Élargir la zone »: the map zooms out once, the search doubles its zone around the centre. */
  widenZone: () => void;
  /** « Retirer les N filtres », then searches the same zone again. */
  clearFilters: () => void;
  /** A quick chip of the home: adds or removes its filter, then searches the same zone again. */
  toggleFilter: (filter: Filter) => void;
  /** Opens the panel on the active filters. */
  openFilters: () => void;
  /** A chip of the panel, or a suggestion of the zero result (a whole group): the draft only. */
  toggleDraft: (filter: Filter) => void;
  removeDraftGroup: (group: RouteFilterGroup) => void;
  /** « Réinitialiser »: no filter left in the draft. */
  resetDraft: () => void;
  /** Closed without applying: the filters stay as they were before the panel opened. */
  closeFilters: () => void;
  /** « Voir N parcours »: the draft becomes the filters, and the zone on screen is searched again. */
  applyFilters: () => void;
  /** The answer of search `id`; false when a newer search replaced it, or it already came. */
  receive: (id: number, result: RouteSearchResult, fetchedAt?: number) => boolean;
  fail: (id: number) => void;
  /**
   * Search `id` cannot reach the API: the results on screen stay, or else the results kept from
   * an earlier session, if any (Ecrans › E-01, hors connexion).
   */
  goOffline: (id: number, cached: CachedResults | null) => void;
  /** A marker, or null for a tap elsewhere on the map. */
  select: (routeId: string | null) => void;
  /** The leading card of the carousel after a scroll of the user. */
  focus: (routeId: string) => void;
  setSort: (sort: RouteSort) => void;
}

export type DiscoveryStore = DiscoveryState & DiscoveryActions;

export const initialDiscoveryState: DiscoveryState = {
  view: null,
  hasMoved: false,
  search: null,
  status: 'idle',
  results: null,
  answer: null,
  resultsAt: null,
  filters: {},
  draft: null,
  selectedRouteId: null,
  focusedRouteId: null,
  framing: null,
  sort: 'recommended',
};

/** Number of active filters, the N of « Retirer les N filtres ». */
export function activeFilterCount(filters: SearchFilters): number {
  return routeFilterGroups.reduce((count, group) => count + (filters[group]?.length ?? 0), 0);
}

/** Routes of the zone: the listed ones, or the sum of the clusters of a zone too large to list. */
export function resultsCount(result: RouteSearchResult): number {
  return result.clusters
    ? result.clusters.reduce((count, cluster) => count + cluster.count, 0)
    : result.items.length;
}

/** The route of the card the user scrolled to, among the results. */
export function focusedRoute(state: DiscoveryState): RouteCard | null {
  return state.results?.items.find((route) => route.id === state.focusedRouteId) ?? null;
}

/** The selected route among the results, if it is still one of them. */
export function selectedRoute(state: DiscoveryState): RouteCard | null {
  return state.results?.items.find((route) => route.id === state.selectedRouteId) ?? null;
}

/**
 * « Rechercher dans cette zone »: after a manual move, or after a failed search so that the zone
 * can be searched again; never over a selected route (E-04), nor offline (E-01).
 */
export function canSearchZone(state: DiscoveryState): boolean {
  const isOffered = state.hasMoved || state.status === 'error';
  return (
    isOffered &&
    state.search !== null &&
    state.selectedRouteId === null &&
    state.status !== 'offline'
  );
}

/**
 * State of the home screen (E-01): the zone of the map, the filters, the results and the selected
 * route. The search runs only when asked (first view, button, widened zone), never on a move.
 */
export function createDiscoveryStore() {
  /** Ids of the searches and of the framings, from one counter. */
  let lastId = 0;
  return createStore<DiscoveryStore>()((set, get) => {
    const startSearch = (
      view: MapView,
      trigger: SearchTrigger,
      filtersSource: FiltersSource | null = null,
    ) => {
      lastId += 1;
      set({
        search: { id: lastId, view, filters: get().filters, trigger, filtersSource },
        status: 'loading',
        hasMoved: false,
      });
    };
    return {
      ...initialDiscoveryState,
      showView: (view, isManual) => {
        const { search, hasMoved } = get();
        set({ view, hasMoved: hasMoved || (isManual && search !== null) });
        if (search === null) {
          startSearch(view, 'initial');
        }
      },
      searchZone: (trigger) => {
        const { view } = get();
        if (view) {
          startSearch(view, trigger);
        }
      },
      widenZone: () => {
        const { view } = get();
        if (!view) {
          return;
        }
        const wider = { bbox: scaleBbox(view.bbox, 2), zoom: view.zoom - 1 };
        lastId += 1;
        set({ view: wider, framing: { id: lastId, view: wider } });
        startSearch(wider, 'button');
      },
      clearFilters: () => {
        set({ filters: {} });
        get().searchZone('button');
      },
      toggleFilter: (filter) => {
        const { filters, view } = get();
        set({ filters: toggleFilter(filters, filter) });
        if (view) {
          startSearch(view, 'button', 'chip');
        }
      },
      openFilters: () => set({ draft: get().filters }),
      toggleDraft: (filter) => {
        const { draft } = get();
        if (draft) {
          set({ draft: toggleFilter(draft, filter) });
        }
      },
      removeDraftGroup: (group) => {
        const { draft } = get();
        if (draft) {
          set({ draft: removeGroup(draft, group) });
        }
      },
      resetDraft: () => {
        if (get().draft) {
          set({ draft: {} });
        }
      },
      closeFilters: () => set({ draft: null }),
      applyFilters: () => {
        const { draft, view } = get();
        if (!draft) {
          return;
        }
        set({ filters: draft, draft: null });
        if (view) {
          startSearch(view, 'button', 'panel');
        }
      },
      receive: (id, result, fetchedAt = Date.now()) => {
        const { search, status, selectedRouteId } = get();
        // A search offline is answered once the network is back.
        if (search?.id !== id || (status !== 'loading' && status !== 'offline')) {
          return false;
        }
        const isStillListed = result.items.some((route) => route.id === selectedRouteId);
        set({
          results: result,
          answer: result,
          resultsAt: fetchedAt,
          status: 'success',
          selectedRouteId: isStillListed ? selectedRouteId : null,
          // New results start the carousel over, with no card to come round to.
          focusedRouteId: null,
        });
        return true;
      },
      fail: (id) => {
        if (get().search?.id === id && get().status === 'loading') {
          set({ status: 'error' });
        }
      },
      goOffline: (id, cached) => {
        const { search, status, answer } = get();
        if (search?.id !== id || status === 'offline' || status === 'idle') {
          return;
        }
        const kept =
          answer === null && cached ? { answer: cached.result, resultsAt: cached.fetchedAt } : {};
        const base = kept.answer ?? answer;
        set({
          status: 'offline',
          ...kept,
          results: base && filterResults(base, search.filters),
        });
      },
      select: (routeId) => set({ selectedRouteId: routeId }),
      focus: (routeId) => set({ focusedRouteId: routeId }),
      setSort: (sort) => set({ sort }),
    };
  });
}
