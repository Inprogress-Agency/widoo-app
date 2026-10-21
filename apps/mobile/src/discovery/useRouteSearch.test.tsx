import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, waitFor } from '@testing-library/react-native';
import type { RouteCard, RouteSearchResult } from '@widoo/shared';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { renderWithQueries, resetDiscovery } from '../test/render';
import { discoveryStore, useRouteSearch } from './useRouteSearch';

jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('../api/client', () => ({ api: { searchRoutes: jest.fn() } }));

const track = analytics.track as jest.Mock;
const searchRoutes = api.searchRoutes as jest.Mock<typeof api.searchRoutes>;

// Fictitious routes and zones around Paris.
function routeAt(id: string, lat: number, lng: number): RouteCard {
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
    steps: [{ category: 'museum', location: { lat, lng }, name: null, durationMin: null }],
  };
}

const wide = { bbox: { west: 2.2, south: 48.8, east: 2.5, north: 48.92 }, zoom: 11 };
const arrival = { bbox: { west: 2.34, south: 48.86, east: 2.38, north: 48.875 }, zoom: 14.2 };
const one = { center: { lat: 48.8652, lng: 2.3611 }, count: 1 };
const clustered: RouteSearchResult = {
  items: [],
  nextCursor: null,
  clusters: [{ center: { lat: 48.871, lng: 2.352 }, count: 3 }, one],
};
const listed: RouteSearchResult = {
  items: [routeAt('near', 48.866, 2.362), routeAt('own', 48.8652, 2.3611)],
  nextCursor: null,
  clusters: null,
};

function Search() {
  useRouteSearch();
  return null;
}

describe('useRouteSearch and the cluster badges (D-108)', () => {
  beforeEach(() => {
    resetDiscovery();
    track.mockClear();
    searchRoutes.mockReset();
  });

  it('searches the zone of a badge « 1 », reports it once and selects its route silently', async () => {
    searchRoutes.mockResolvedValueOnce(clustered).mockResolvedValueOnce(listed);
    await renderWithQueries(<Search />);
    await act(() => discoveryStore.getState().showView(wide, false));
    await waitFor(() => expect(discoveryStore.getState().status).toBe('success'));
    track.mockClear();

    await act(() => {
      discoveryStore.getState().pressCluster(one, true);
      discoveryStore.getState().showView(arrival, true);
    });
    await waitFor(() => expect(discoveryStore.getState().selectedRouteId).toBe('own'));
    expect(searchRoutes).toHaveBeenLastCalledWith(
      expect.objectContaining({ bbox: arrival.bbox }),
      expect.anything(),
    );
    // One event for the search, none for the selection (wiki Analytics).
    expect(track.mock.calls).toEqual([
      ['map_search_zone', { trigger: 'cluster', zoom: 14.2, results_count: 2 }],
    ]);
  });
});
