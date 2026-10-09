import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { LatLng, RouteCard, RouteSearchResult } from '@widoo/shared';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { discoveryStore } from '../discovery/useRouteSearch';
import { renderWithQueries, resetDiscovery, testView } from '../test/render';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { SectionList } from './SectionList';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
// The card and its skeleton, animated, are seen on the device: here, only their place counts.
jest.mock('./RouteCard', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { RouteCard: ({ route }: { route: { title: string } }) => <Text>{route.title}</Text> };
});
jest.mock('./RouteCardSkeleton', () => ({ RouteCardSkeleton: () => null }));
// Another sort asks the API for its pages: unless a test answers, they never come.
jest.mock('../api/client', () => ({
  api: {
    searchRoutes: jest.fn(() => new Promise(() => {})),
    countRoutes: () => new Promise(() => {}),
  },
}));

const track = analytics.track as jest.Mock;
const searchRoutes = api.searchRoutes as jest.Mock<typeof api.searchRoutes>;

// Fictitious routes.
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
}

const listed = (ids: string[]): RouteSearchResult => ({
  items: ids.map(route),
  nextCursor: null,
  clusters: null,
});

function showZone(ids: string[]) {
  const results = listed(ids);
  discoveryStore.setState({
    search: { id: 1, view: testView, filters: {}, trigger: 'initial', filtersSource: null },
    status: 'success',
    results,
    resultsAt: 1_000,
  });
}

function renderList(position: LatLng | null = null) {
  return renderWithQueries(
    <SectionList
      section="nearby"
      position={position}
      onEnableLocation={() => {}}
      onBack={() => {}}
      onOpenRoute={() => {}}
    />,
  );
}

const eventsNamed = (name: string) =>
  track.mock.calls.filter(([event]) => event === name).map(([, properties]) => properties);

async function openSort() {
  // The pinned bar may be drawn twice by FlashList: in the list and as its sticky header.
  const [pill] = screen.getAllByLabelText(/^Trier par, /);
  await fireEvent.press(pill ?? screen.getByLabelText(/^Trier par, /));
}

async function chooseSort(label: string) {
  await openSort();
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${label}, `) }));
  // The mock of the sheet never tells its dismissal: the screen comes back by hand.
  await act(async () => {
    setModalSheetOpen(false);
  });
}

describe('SectionList analytics', () => {
  beforeEach(() => {
    resetDiscovery();
    track.mockClear();
  });

  it('sends list_sorted when the sort changes, and nothing for the same sort', async () => {
    showZone(['a']);
    await renderList();
    await chooseSort('Recommandé');
    expect(eventsNamed('list_sorted')).toEqual([]);
    await chooseSort('Durée');
    expect(eventsNamed('list_sorted')).toEqual([
      { section: 'nearby', sort: 'duration', previous_sort: 'recommended' },
    ]);
    expect(discoveryStore.getState().sort).toBe('duration');
  });

  it('sends result_card_viewed for the cards of the list, once each', async () => {
    showZone(['a', 'b']);
    await renderList();
    await waitFor(() => expect(eventsNamed('result_card_viewed')).toHaveLength(2));
    expect(eventsNamed('result_card_viewed')).toEqual([
      { route_id: 'a', position: 0, section: 'nearby', sheet_level: 'list', sort: 'recommended' },
      { route_id: 'b', position: 1, section: 'nearby', sheet_level: 'list', sort: 'recommended' },
    ]);
  });

  it('reports the cards again in the new sort, at the same positions', async () => {
    showZone(['a', 'b']);
    searchRoutes.mockResolvedValueOnce(listed(['b', 'a']));
    await renderList();
    await waitFor(() => expect(eventsNamed('result_card_viewed')).toHaveLength(2));
    await chooseSort('Durée');
    await waitFor(() => expect(eventsNamed('result_card_viewed')).toHaveLength(4));
    expect(eventsNamed('result_card_viewed').slice(2)).toEqual([
      { route_id: 'b', position: 0, section: 'nearby', sheet_level: 'list', sort: 'duration' },
      { route_id: 'a', position: 1, section: 'nearby', sheet_level: 'list', sort: 'duration' },
    ]);
    // Back to the sheet's sort, whose routes are there at once on the same indices.
    await chooseSort('Recommandé');
    await waitFor(() => expect(eventsNamed('result_card_viewed')).toHaveLength(6));
    expect(eventsNamed('result_card_viewed').slice(4)).toEqual([
      { route_id: 'a', position: 0, section: 'nearby', sheet_level: 'list', sort: 'recommended' },
      { route_id: 'b', position: 1, section: 'nearby', sheet_level: 'list', sort: 'recommended' },
    ]);
  });
});

describe('SectionList sort sheet', () => {
  beforeEach(() => {
    resetDiscovery();
  });

  it('describes Recommandé without proximity when there is no position (D-071)', async () => {
    showZone(['a']);
    await renderList(null);
    await openSort();
    expect(
      screen.getByRole('radio', { name: 'Recommandé, Qualité et contexte du moment' }),
    ).toBeTruthy();
  });

  it('describes Recommandé with proximity around the user', async () => {
    showZone(['a']);
    await renderList({ lat: 48.8674, lng: 2.3636 });
    await openSort();
    expect(
      screen.getByRole('radio', { name: 'Recommandé, Proximité, qualité et contexte du moment' }),
    ).toBeTruthy();
  });
});
