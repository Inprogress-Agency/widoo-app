import type { GeocodeZone, RouteCard } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { resultCounts, textSearchView, type Group, type TextSearchInput } from './textSearch';

// Fictitious answers: only their length matters here.
const zones = [{ id: 'zone' }] as unknown as GeocodeZone[];
const routes = [{ id: 'route' }, { id: 'other' }] as unknown as RouteCard[];

const done = <T>(data: T): Group<T> => ({ status: 'success', data, isFetching: false });
const failed: Group<never> = { status: 'error', data: undefined, isFetching: false };
const pending: Group<never> = { status: 'pending', data: undefined, isFetching: true };

const input = (overrides: Partial<TextSearchInput> = {}): TextSearchInput => ({
  text: 'canal',
  settled: 'canal',
  isOnline: true,
  zones: done(zones),
  routes: done(routes),
  ...overrides,
});

describe('textSearchView', () => {
  it('shows the recent zones under two characters, online or not', () => {
    expect(textSearchView(input({ text: 'c', isOnline: false }))).toEqual({
      kind: 'recent',
      isLoading: false,
    });
  });

  it('keeps the recent zones until the first results come', () => {
    expect(textSearchView(input({ zones: pending, routes: pending }))).toEqual({
      kind: 'recent',
      isLoading: true,
    });
  });

  it('asks nothing offline, a text typed or not', () => {
    expect(textSearchView(input({ isOnline: false }))).toEqual({ kind: 'offline' });
  });

  it('shows the results, loading while the text is not yet sent or a group runs', () => {
    expect(textSearchView(input())).toEqual({ kind: 'results', isLoading: false });
    expect(textSearchView(input({ text: 'canal s' }))).toEqual({
      kind: 'results',
      isLoading: true,
    });
    const running = { ...done(zones), isFetching: true };
    expect(textSearchView(input({ zones: running }))).toEqual({ kind: 'results', isLoading: true });
  });

  it('keeps the group that answered when the other fails', () => {
    expect(textSearchView(input({ zones: failed }))).toEqual({ kind: 'results', isLoading: false });
    expect(textSearchView(input({ routes: failed }))).toEqual({
      kind: 'results',
      isLoading: false,
    });
  });

  it('tells the total error once both failed', () => {
    expect(textSearchView(input({ zones: failed, routes: failed }))).toEqual({ kind: 'failed' });
  });

  it('tells that nothing was found', () => {
    expect(textSearchView(input({ zones: done([]), routes: done([]) }))).toEqual({ kind: 'empty' });
  });
});

describe('resultCounts', () => {
  it('counts each group once answered, and nothing while loading', () => {
    expect(resultCounts(input())).toEqual({ zones: 1, routes: 2 });
    expect(resultCounts(input({ zones: failed }))).toEqual({ zones: 0, routes: 2 });
    expect(resultCounts(input({ text: 'canal s' }))).toBeNull();
    expect(resultCounts(input({ zones: pending, routes: pending }))).toBeNull();
  });
});
