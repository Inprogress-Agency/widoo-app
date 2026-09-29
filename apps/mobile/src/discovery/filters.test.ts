import type { RouteCard, RouteSearchResult } from '@widoo/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { activeFilters, filterResults, quickFilters, removeGroup, toggleFilter } from './filters';
import { createDiscoveryStore, type MapView } from './store';

// Fictitious routes around Paris, told apart by their mood.
function route(id: string, mood: RouteCard['moods'][number]): RouteCard {
  return {
    id,
    title: `Parcours ${id}`,
    coverUrl: null,
    isOfficial: true,
    author: null,
    access: 'free',
    isVerified: false,
    moods: [mood],
    audiences: ['couple'],
    conditions: ['outdoor'],
    transport: 'walk',
    district: null,
    neighborhood: null,
    durationMin: 120,
    durationBucket: '1_2h',
    budgetPerPersonEur: 0,
    budgetBucket: 'free',
    distanceM: 1500,
    rating: { average: null, count: 0 },
    isLocked: false,
    stepCount: 0,
    steps: [],
  };
}

const answer: RouteSearchResult = {
  items: [route('a', 'culture'), route('b', 'food'), route('c', 'nature')],
  nextCursor: null,
  clusters: null,
};

const home: MapView = { bbox: { west: 2.33, south: 48.85, east: 2.37, north: 48.87 }, zoom: 13 };

describe('filters', () => {
  it('adds and removes a value, in the order of its taxonomy, dropping an emptied group', () => {
    let filters = toggleFilter({}, { group: 'moods', value: 'food' });
    filters = toggleFilter(filters, { group: 'moods', value: 'culture' });
    expect(filters).toEqual({ moods: ['culture', 'food'] });
    filters = toggleFilter(filters, { group: 'moods', value: 'culture' });
    filters = toggleFilter(filters, { group: 'moods', value: 'food' });
    expect(filters).toEqual({});
  });

  it('removes a whole group, as a suggestion of the zero result does', () => {
    expect(removeGroup({ moods: ['food'], budgets: ['free'] }, 'moods')).toEqual({
      budgets: ['free'],
    });
  });

  it('lists the active filters in the order of the panel: Public, Budget, Durée...', () => {
    expect(activeFilters({ moods: ['culture'], budgets: ['low'], audiences: ['couple'] })).toEqual([
      { group: 'audiences', value: 'couple' },
      { group: 'budgets', value: 'low' },
      { group: 'moods', value: 'culture' },
    ]);
  });

  it('starts the quick chips with Gratuit, then the publics, Extérieur and the moods', () => {
    expect(quickFilters.slice(0, 6).map((filter) => filter.value)).toEqual([
      'free',
      'couple',
      'solo',
      'family',
      'friends',
      'outdoor',
    ]);
    expect(quickFilters.filter((filter) => filter.group === 'moods')).toHaveLength(9);
  });

  it('filters the cards kept offline, and leaves an unfiltered answer as it is', () => {
    expect(filterResults(answer, {})).toBe(answer);
    expect(filterResults(answer, { moods: ['food', 'nature'] }).items.map((r) => r.id)).toEqual([
      'b',
      'c',
    ]);
  });
});

describe('filters of the discovery store', () => {
  let store: ReturnType<typeof createDiscoveryStore>;

  function searchId(): number {
    const id = store.getState().search?.id;
    if (id === undefined) {
      throw new Error('No search asked for');
    }
    return id;
  }

  beforeEach(() => {
    store = createDiscoveryStore();
    store.getState().showView(home, false);
    store.getState().receive(searchId(), answer);
  });

  it('shares one state between the chips and the panel', () => {
    store.getState().toggleFilter({ group: 'moods', value: 'culture' });
    store.getState().openFilters();
    expect(store.getState().draft).toEqual({ moods: ['culture'] });
  });

  it('searches the zone again at once on a quick chip, with the chip as source', () => {
    store.getState().toggleFilter({ group: 'budgets', value: 'free' });
    expect(store.getState().search).toMatchObject({
      view: home,
      filters: { budgets: ['free'] },
      trigger: 'button',
      filtersSource: 'chip',
    });
    expect(store.getState().status).toBe('loading');
  });

  it('changes the draft only while the panel is open, and searches nothing', () => {
    const search = store.getState().search;
    store.getState().openFilters();
    store.getState().toggleDraft({ group: 'moods', value: 'food' });
    store.getState().toggleDraft({ group: 'durations', value: 'weekend' });
    store.getState().removeDraftGroup('durations');
    expect(store.getState().draft).toEqual({ moods: ['food'] });
    expect(store.getState().filters).toEqual({});
    expect(store.getState().search).toBe(search);
  });

  it('restores the filters of before the panel when it closes without applying', () => {
    store.getState().toggleFilter({ group: 'moods', value: 'culture' });
    store.getState().openFilters();
    store.getState().toggleDraft({ group: 'moods', value: 'culture' });
    store.getState().toggleDraft({ group: 'moods', value: 'food' });
    store.getState().closeFilters();
    expect(store.getState().draft).toBeNull();
    expect(store.getState().filters).toEqual({ moods: ['culture'] });
    store.getState().openFilters();
    expect(store.getState().draft).toEqual({ moods: ['culture'] });
  });

  it('applies the draft: closes the panel and searches the zone on screen again', () => {
    store.getState().openFilters();
    store.getState().toggleDraft({ group: 'moods', value: 'food' });
    store.getState().applyFilters();
    expect(store.getState().draft).toBeNull();
    expect(store.getState().filters).toEqual({ moods: ['food'] });
    expect(store.getState().search).toMatchObject({
      view: home,
      filters: { moods: ['food'] },
      filtersSource: 'panel',
    });
  });

  it('empties the draft on « Réinitialiser », and applies no filter at all', () => {
    store.getState().toggleFilter({ group: 'moods', value: 'culture' });
    store.getState().openFilters();
    store.getState().resetDraft();
    expect(store.getState().draft).toEqual({});
    store.getState().applyFilters();
    expect(store.getState().filters).toEqual({});
  });

  it('applies the filters to the results kept offline, and takes a filter back', () => {
    store.getState().toggleFilter({ group: 'moods', value: 'food' });
    store.getState().goOffline(searchId(), null);
    expect(store.getState().results?.items.map((r) => r.id)).toEqual(['b']);
    store.getState().toggleFilter({ group: 'moods', value: 'food' });
    store.getState().goOffline(searchId(), null);
    expect(store.getState().results?.items.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('filters the results of an earlier session offline too', () => {
    store = createDiscoveryStore();
    store.getState().toggleFilter({ group: 'moods', value: 'culture' });
    store.getState().showView(home, false);
    store.getState().goOffline(searchId(), { result: answer, fetchedAt: 1_000 });
    expect(store.getState().results?.items.map((r) => r.id)).toEqual(['a']);
    expect(store.getState().answer).toBe(answer);
  });
});
