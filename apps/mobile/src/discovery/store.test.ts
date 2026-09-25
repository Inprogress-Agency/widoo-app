import type { RouteCard, RouteSearchResult } from '@widoo/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  canSearchZone,
  createDiscoveryStore,
  focusedRoute,
  resultsCount,
  selectedRoute,
  type MapView,
} from './store';

// Fictitious routes and zones around Paris.
function route(id: string): RouteCard {
  return {
    id,
    title: `Parcours ${id}`,
    coverUrl: null,
    isOfficial: true,
    author: null,
    access: 'free',
    isVerified: false,
    moods: ['culture'],
    audiences: [],
    district: null,
    neighborhood: null,
    durationMin: 120,
    durationBucket: '1_2h',
    budgetPerPersonEur: { min: 0, max: 0 },
    budgetBucket: 'free',
    distanceM: 1500,
    rating: { average: null, count: 0 },
    steps: [{ category: 'museum', location: { lat: 48.86, lng: 2.34 } }],
  };
}

const listed = (...ids: string[]): RouteSearchResult => ({
  items: ids.map(route),
  nextCursor: null,
  clusters: null,
});

const home: MapView = { bbox: { west: 2.33, south: 48.85, east: 2.37, north: 48.87 }, zoom: 13 };
const moved: MapView = { bbox: { west: 2.35, south: 48.86, east: 2.39, north: 48.88 }, zoom: 13 };

let store: ReturnType<typeof createDiscoveryStore>;

/** Id of the last search asked for. */
function searchId(): number {
  const { search } = store.getState();
  if (!search) {
    throw new Error('No search asked for');
  }
  return search.id;
}

/** The map opens on `home` and its first search is answered with `ids`. */
function openedWith(...ids: string[]) {
  store.getState().showView(home, false);
  store.getState().receive(searchId(), listed(...ids));
}

beforeEach(() => {
  store = createDiscoveryStore();
});

describe('discovery store', () => {
  it('starts the initial search on the first view of the map', () => {
    store.getState().showView(home, false);
    const { search, status, hasMoved } = store.getState();
    expect(search).toMatchObject({ view: home, filters: {}, trigger: 'initial' });
    expect(status).toBe('loading');
    expect(hasMoved).toBe(false);
  });

  it('never searches on a move: it shows the button and keeps the previous results', () => {
    openedWith('a', 'b');
    const before = store.getState().search;
    store.getState().showView(moved, true);
    const state = store.getState();
    expect(state.search).toBe(before);
    expect(state.status).toBe('success');
    expect(state.results?.items.map((r) => r.id)).toEqual(['a', 'b']);
    expect(canSearchZone(state)).toBe(true);
  });

  it('does not offer the button after a move of the app', () => {
    openedWith('a');
    store.getState().showView(moved, false);
    expect(canSearchZone(store.getState())).toBe(false);
  });

  it('searches the zone on screen when the button is pressed, then hides it', () => {
    openedWith('a');
    store.getState().showView(moved, true);
    store.getState().searchZone('button');
    const state = store.getState();
    expect(state.search).toMatchObject({ view: moved, trigger: 'button' });
    expect(state.status).toBe('loading');
    expect(canSearchZone(state)).toBe(false);
    expect(state.results?.items.map((r) => r.id)).toEqual(['a']);
  });

  it('replaces the results with the answer of the zone', () => {
    openedWith('a');
    store.getState().showView(moved, true);
    store.getState().searchZone('button');
    expect(store.getState().receive(searchId(), listed('c'))).toBe(true);
    expect(store.getState().results?.items.map((r) => r.id)).toEqual(['c']);
    expect(store.getState().status).toBe('success');
  });

  it('drops the answer of a search that a newer one replaced, and a second copy', () => {
    openedWith('a');
    store.getState().showView(moved, true);
    store.getState().searchZone('button');
    const older = searchId();
    store.getState().showView(home, true);
    store.getState().searchZone('button');
    expect(store.getState().receive(older, listed('old'))).toBe(false);
    const newer = searchId();
    expect(store.getState().receive(newer, listed('new'))).toBe(true);
    expect(store.getState().receive(newer, listed('again'))).toBe(false);
    expect(store.getState().results?.items.map((r) => r.id)).toEqual(['new']);
  });

  it('keeps the previous results when a search fails', () => {
    openedWith('a');
    store.getState().showView(moved, true);
    store.getState().searchZone('button');
    store.getState().fail(searchId());
    expect(store.getState().status).toBe('error');
    expect(store.getState().results?.items.map((r) => r.id)).toEqual(['a']);
  });

  it('offers the button again after a failed search, to search the same zone', () => {
    openedWith('a');
    store.getState().showView(moved, true);
    store.getState().searchZone('button');
    store.getState().fail(searchId());
    expect(canSearchZone(store.getState())).toBe(true);
    store.getState().searchZone('button');
    expect(store.getState().search).toMatchObject({ view: moved, trigger: 'button' });
    expect(store.getState().status).toBe('loading');
    expect(canSearchZone(store.getState())).toBe(false);
  });

  it('hides the button while a route is selected', () => {
    openedWith('a', 'b');
    store.getState().select('b');
    store.getState().showView(moved, true);
    expect(selectedRoute(store.getState())?.id).toBe('b');
    expect(canSearchZone(store.getState())).toBe(false);
    store.getState().select(null);
    expect(canSearchZone(store.getState())).toBe(true);
  });

  it('keeps the selection only if the new results still hold the route', () => {
    openedWith('a', 'b');
    store.getState().select('b');
    store.getState().searchZone('geocode');
    store.getState().receive(searchId(), listed('b', 'c'));
    expect(store.getState().selectedRouteId).toBe('b');
    store.getState().searchZone('geocode');
    store.getState().receive(searchId(), listed('c'));
    expect(store.getState().selectedRouteId).toBeNull();
  });

  it('widens the zone: frames the map one zoom level out and searches twice the zone', () => {
    openedWith();
    store.getState().widenZone();
    const { search, framing, view } = store.getState();
    expect(search?.trigger).toBe('button');
    expect(search?.view.zoom).toBe(12);
    const bbox = search?.view.bbox ?? home.bbox;
    expect(bbox.east - bbox.west).toBeCloseTo(0.08);
    expect(framing?.view).toEqual(search?.view);
    expect(view).toEqual(search?.view);
  });

  it('searches again without filters when they are removed', () => {
    store.setState({ filters: { moods: ['food'], audiences: ['couple', 'solo'] } });
    store.getState().showView(home, false);
    expect(store.getState().search?.filters).toEqual({
      moods: ['food'],
      audiences: ['couple', 'solo'],
    });
    store.getState().clearFilters();
    expect(store.getState().filters).toEqual({});
    expect(store.getState().search).toMatchObject({ view: home, filters: {}, trigger: 'button' });
  });
});

describe('activeFilterCount', () => {
  it('counts every active value of every group', () => {
    expect(activeFilterCount({})).toBe(0);
    expect(
      activeFilterCount({ moods: ['food', 'nature'], budgets: ['free'], transports: [] }),
    ).toBe(3);
  });
});

describe('resultsCount', () => {
  it('counts the listed routes, or the routes of the clusters', () => {
    expect(resultsCount(listed('a', 'b'))).toBe(2);
    expect(
      resultsCount({
        items: [],
        nextCursor: null,
        clusters: [
          { center: { lat: 48.86, lng: 2.34 }, count: 12 },
          { center: { lat: 48.88, lng: 2.36 }, count: 5 },
        ],
      }),
    ).toBe(17);
  });
});

describe('offline', () => {
  beforeEach(() => {
    store = createDiscoveryStore();
  });

  const cached = { result: listed('kept'), fetchedAt: 1_000 };

  it('keeps the results on screen and their time when the network is gone', () => {
    store.getState().showView(home, false);
    store.getState().receive(searchId(), listed('a'), 5_000);
    store.getState().showView(moved, true);
    store.getState().searchZone('button');
    store.getState().goOffline(searchId(), cached);
    const state = store.getState();
    expect(state.status).toBe('offline');
    expect(state.results?.items.map((item) => item.id)).toEqual(['a']);
    expect(state.resultsAt).toBe(5_000);
    expect(canSearchZone(state)).toBe(false);
  });

  it('shows the results kept from an earlier session without any on screen', () => {
    store.getState().showView(home, false);
    store.getState().goOffline(searchId(), cached);
    expect(store.getState().results?.items.map((item) => item.id)).toEqual(['kept']);
    expect(store.getState().resultsAt).toBe(1_000);
  });

  it('stays without results when nothing was kept', () => {
    store.getState().showView(home, false);
    store.getState().goOffline(searchId(), null);
    expect(store.getState()).toMatchObject({ status: 'offline', results: null });
  });

  it('takes the answer once the network is back', () => {
    store.getState().showView(home, false);
    const id = searchId();
    store.getState().goOffline(id, cached);
    expect(store.getState().receive(id, listed('fresh'), 9_000)).toBe(true);
    expect(store.getState()).toMatchObject({ status: 'success', resultsAt: 9_000 });
  });

  it('ignores an older search', () => {
    store.getState().showView(home, false);
    const older = searchId();
    store.getState().searchZone('button');
    store.getState().goOffline(older, cached);
    expect(store.getState().status).toBe('loading');
  });
});

describe('focus', () => {
  beforeEach(() => {
    store = createDiscoveryStore();
  });

  it('follows the card the user scrolled to, and forgets it with new results', () => {
    openedWith('a', 'b');
    store.getState().focus('b');
    expect(focusedRoute(store.getState())?.id).toBe('b');
    store.getState().searchZone('button');
    store.getState().receive(searchId(), listed('b', 'c'));
    expect(focusedRoute(store.getState())).toBeNull();
  });
});

describe('offline after an answer', () => {
  beforeEach(() => {
    store = createDiscoveryStore();
  });

  it('dates the results of a zone already answered once the network is gone', () => {
    openedWith('a');
    store.getState().goOffline(searchId(), { result: listed('kept'), fetchedAt: 1 });
    expect(store.getState().status).toBe('offline');
    expect(store.getState().results?.items.map((item) => item.id)).toEqual(['a']);
  });
});
