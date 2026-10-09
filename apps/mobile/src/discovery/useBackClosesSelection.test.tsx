import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import type { RouteCard } from '@widoo/shared';
import type { EffectCallback } from 'react';
import { BackHandler } from 'react-native';
import { resetDiscovery, testView } from '../test/render';
import { useBackClosesSelection } from './useBackClosesSelection';
import { discoveryStore } from './useRouteSearch';

jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('../api/client', () => ({ api: {} }));
// Outside a navigator, the home is the screen shown: its focus effect runs as a plain effect.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (effect: EffectCallback) => useEffect(effect, [effect]) };
});

// A fictitious route.
const route: RouteCard = {
  id: 'r1',
  title: 'Parcours r1',
  coverUrl: null,
  isOfficial: true,
  author: null,
  access: 'free',
  isVerified: false,
  moods: ['culture'],
  audiences: [],
  conditions: [],
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
  stepCount: 1,
  steps: [
    { category: 'museum', location: { lat: 48.86, lng: 2.34 }, name: null, durationMin: null },
  ],
};

/** The listeners of the Back button, the last added first, as React Native calls them. */
let listeners: Parameters<typeof BackHandler.addEventListener>[1][] = [];

/** A press of the Back button: whether the app consumed it, or left it to the system. */
async function pressBack(): Promise<boolean> {
  let isConsumed = false;
  await act(() => {
    isConsumed = [...listeners]
      .reverse()
      .some((listener) => listener({ type: 'hardwareBackPress', timeStamp: 0 }) === true);
  });
  return isConsumed;
}

describe('useBackClosesSelection', () => {
  beforeEach(() => {
    resetDiscovery();
    discoveryStore.setState({
      search: { id: 1, view: testView, filters: {}, trigger: 'initial', filtersSource: null },
      status: 'success',
      results: { items: [route], nextCursor: null, clusters: null },
    });
    listeners = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener);
      return { remove: () => (listeners = listeners.filter((other) => other !== listener)) };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('closes a selected route in one press, and consumes it', async () => {
    discoveryStore.setState({ selectedRouteId: 'r1' });
    await renderHook(() => useBackClosesSelection());
    expect(await pressBack()).toBe(true);
    expect(discoveryStore.getState().selectedRouteId).toBeNull();
    // Nothing selected any more: the next press is the system's.
    expect(listeners).toHaveLength(0);
    expect(await pressBack()).toBe(false);
  });

  it('leaves Back to the system without a selection', async () => {
    await renderHook(() => useBackClosesSelection());
    expect(listeners).toHaveLength(0);
    expect(await pressBack()).toBe(false);
  });

  it('listens again once a route is selected', async () => {
    await renderHook(() => useBackClosesSelection());
    await act(() => discoveryStore.getState().select('r1'));
    expect(await pressBack()).toBe(true);
    expect(discoveryStore.getState().selectedRouteId).toBeNull();
  });

  it('stops listening when the home is left', async () => {
    discoveryStore.setState({ selectedRouteId: 'r1' });
    const { unmount } = await renderHook(() => useBackClosesSelection());
    await unmount();
    expect(await pressBack()).toBe(false);
    expect(discoveryStore.getState().selectedRouteId).toBe('r1');
  });
});
