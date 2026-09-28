import { describe, expect, it } from 'vitest';
import { filterCountOf, suggestionsOf } from './filterCount';

const filters = {
  audiences: ['family' as const, 'dog_friendly' as const],
  durations: ['weekend' as const],
  conditions: ['wheelchair' as const],
  moods: ['culture' as const],
};

describe('suggestionsOf', () => {
  it('offers the groups that bring routes back, the most useful first, three at most', () => {
    const result = { count: 0, without: { durations: 12, conditions: 5, audiences: 3, moods: 1 } };
    expect(
      suggestionsOf(result, filters).map(({ group, gain, filters: values }) => ({
        group,
        gain,
        values: values.map((filter) => filter.value),
      })),
    ).toEqual([
      { group: 'durations', gain: 12, values: ['weekend'] },
      { group: 'conditions', gain: 5, values: ['wheelchair'] },
      { group: 'audiences', gain: 3, values: ['family', 'dog_friendly'] },
    ]);
  });

  it('leaves out a group that brings nothing back, and offers nothing above zero', () => {
    expect(suggestionsOf({ count: 0, without: { durations: 0, moods: 2 } }, filters)).toEqual([
      expect.objectContaining({ group: 'moods', gain: 2 }),
    ]);
    expect(suggestionsOf({ count: 4, without: { durations: 9 } }, filters)).toEqual([]);
    expect(suggestionsOf({ count: 0 }, filters)).toEqual([]);
  });
});

describe('filterCountOf', () => {
  const state = { isOnline: true, isWaiting: false, data: undefined, isError: false, filters };

  it('counts while the taps settle and the answer comes', () => {
    expect(filterCountOf({ ...state, isWaiting: true, data: { count: 3 } })).toEqual({
      status: 'counting',
    });
    expect(filterCountOf(state)).toEqual({ status: 'counting' });
  });

  it('shows the count, with the suggestions at zero', () => {
    expect(filterCountOf({ ...state, data: { count: 9 } })).toEqual({
      status: 'counted',
      count: 9,
      suggestions: [],
    });
    expect(
      filterCountOf({ ...state, data: { count: 0, without: { durations: 2 } } }),
    ).toMatchObject({ status: 'counted', count: 0, suggestions: [{ group: 'durations' }] });
  });

  it('tells the count unavailable after a failure or a timeout, and offline apart', () => {
    expect(filterCountOf({ ...state, isError: true })).toEqual({ status: 'unavailable' });
    expect(filterCountOf({ ...state, isOnline: false, data: { count: 9 } })).toEqual({
      status: 'offline',
    });
  });
});
