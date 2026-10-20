import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { RouteDetail, type PlannedRoute } from '@widoo/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import RouteScreen from '../../app/route/[id]';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { discoveryStore } from '../discovery/useRouteSearch';
import { plannedFixture } from '../go/testPlanned';
import type { PlanChoice } from '../plan/PlanSheet';
import { fakeAuth } from '../test/fakeAuth';
import { showToast } from '../ui/toastStore';
import fixtures from './generated/route-sheets.json';
import { RouteSheetSourceContext, type RouteSheetSource } from './source';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
// The sheet goes through the client of the app, on answers of the API simulated by the test.
const mockFetch = jest.fn<typeof fetch>();
jest.mock('../api/client', () => {
  const { createApiClient } =
    jest.requireActual<typeof import('@widoo/api-client')>('@widoo/api-client');
  const client = createApiClient({
    baseUrl: 'http://api.test',
    fetch: (input, init) => mockFetch(input, init),
  });
  return {
    api: {
      listPlanned: jest.fn(),
      updatePlanned: jest.fn(),
      createPlanned: jest.fn(),
      getRoute: client.getRoute,
      getRouteTimeline: client.getRouteTimeline,
    },
  };
});
// Signed in already: the account asked for is there.
jest.mock('../auth/signIn', () => ({
  signInFlow: { requireAccount: (_reason: string, then: () => void) => then() },
}));
jest.mock('../go/useGo', () => ({ useStartGo: () => jest.fn() }));
jest.mock('../ui/toastStore', () => ({
  ...jest.requireActual<object>('../ui/toastStore'),
  showToast: jest.fn(),
}));
// The sheet E-05 and E-06 have their own tests: here, how the screen leads from one to the other.
jest.mock('./RouteSheet', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    RouteSheet: ({
      state,
      onPlan,
      onNearby,
    }: {
      state:
        | { status: 'ready'; route: unknown }
        | { status: 'removed'; near: { lat: number; lng: number } }
        | { status: 'error'; isOffline: boolean }
        | { status: 'loading' };
      onPlan: (route: unknown) => void;
      onNearby: (near: { lat: number; lng: number }) => void;
    }) => {
      switch (state.status) {
        case 'ready':
          return (
            <Pressable accessibilityRole="button" onPress={() => onPlan(state.route)}>
              <Text>Programmer</Text>
            </Pressable>
          );
        case 'removed':
          return (
            <Pressable accessibilityRole="button" onPress={() => onNearby(state.near)}>
              <Text>Voir des parcours proches</Text>
            </Pressable>
          );
        case 'error':
          return <Text>{state.isOffline ? 'Hors connexion' : 'Erreur'}</Text>;
        default:
          return null;
      }
    },
  };
});
const mockOpenSheet = jest.fn();
let mockSubmit: (choice: PlanChoice) => Promise<boolean> = async () => false;
jest.mock('../plan/PlanSheet', () => {
  const { useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  return {
    PlanSheet: (props: {
      ref: import('react').Ref<unknown>;
      onSubmit: (choice: PlanChoice) => Promise<boolean>;
    }) => {
      useImperativeHandle(props.ref, () => ({ open: mockOpenSheet }));
      mockSubmit = props.onSubmit;
      return null;
    },
  };
});

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const route = RouteDetail.parse(fixtures.routes[0]);
const fixture = plannedFixture();
const upcoming: PlannedRoute = { ...fixture, status: 'planned', routeId: route.id };
const missed: PlannedRoute = { ...upcoming, id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e40' };
const source: RouteSheetSource = {
  getRoute: async () => ({ kind: 'route', route }),
  getTimeline: async () => route.timeline,
};
const push = jest.mocked(router.push);
const listPlanned = jest.mocked(api.listPlanned);

let client = new QueryClient();
afterEach(() => client.clear());

/** The screen on the source the test gives, or on the one of the app: the API. */
async function renderRoute(
  params: Record<string, string>,
  given: RouteSheetSource | null = source,
) {
  mockParams = params;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const screenOf = <RouteScreen />;
  await render(
    <QueryClientProvider client={client}>
      {given ? (
        <RouteSheetSourceContext value={given}>{screenOf}</RouteSheetSourceContext>
      ) : (
        screenOf
      )}
    </QueryClientProvider>,
  );
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('E-05, the way to « Votre sortie »', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    await act(() => fakeAuth.setUser(user));
  });

  it('opens « Votre sortie » from the date of a route planned, not E-06', async () => {
    listPlanned.mockResolvedValue({ items: [upcoming], nextCursor: null });
    await renderRoute({ id: route.id });
    await fireEvent.press(await screen.findByRole('button', { name: 'Programmer' }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith({ pathname: '/outing/[id]', params: { id: upcoming.id } }),
    );
    expect(mockOpenSheet).not.toHaveBeenCalled();
  });

  it('opens E-06 for « Reprogrammer », brings the outing back, and « Voir » opens it', async () => {
    listPlanned.mockResolvedValue({ items: [], nextCursor: null });
    jest.mocked(api.updatePlanned).mockResolvedValue(missed);
    await renderRoute({ id: route.id, reschedule: missed.id });
    await waitFor(() => expect(mockOpenSheet).toHaveBeenCalledWith(route, null));
    const choice = { route, planned: null, day: '2026-10-31', minute: 600, notice: null };
    await act(() => mockSubmit({ ...choice, checked: new Set() }));
    expect(api.updatePlanned).toHaveBeenCalledWith(missed.id, {
      status: 'planned',
      startsAt: '2026-10-31T10:00:00+01:00',
    });
    expect(analytics.track).toHaveBeenCalledWith(
      'route_planned',
      expect.objectContaining({ route_id: route.id, source: 'past' }),
    );
    const options = jest.mocked(showToast).mock.calls[0]?.[2];
    await act(async () => options?.action?.onPress());
    expect(push).toHaveBeenLastCalledWith({ pathname: '/outing/[id]', params: { id: missed.id } });
  });
});

describe('E-05 on the answers of the API', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    listPlanned.mockResolvedValue({ items: [], nextCursor: null });
    await act(() => fakeAuth.setUser(user));
  });

  it('reads the sheet from GET /v1/routes/:id when no source is given', async () => {
    mockFetch.mockResolvedValue(json(200, route));
    await renderRoute({ id: route.id }, null);
    expect(await screen.findByRole('button', { name: 'Programmer' })).toBeTruthy();
    expect(mockFetch.mock.calls[0]?.[0]).toBe(`http://api.test/v1/routes/${route.id}`);
  });

  it('sends the token of a private link with the request of the sheet', async () => {
    mockFetch.mockResolvedValue(json(200, route));
    await renderRoute({ id: route.id, token: 'lien-prive-fictif-0001' }, null);
    await screen.findByRole('button', { name: 'Programmer' });
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      `http://api.test/v1/routes/${route.id}?token=lien-prive-fictif-0001`,
    );
  });

  it('centres the home on the zone of a withdrawn route, from the 410', async () => {
    const near = { lat: 48.86, lng: 2.35 };
    const details = { removedAt: '2026-09-20T08:00:00.000Z', near };
    mockFetch.mockResolvedValue(json(410, { code: 'route_removed', message: 'Gone', details }));
    await renderRoute({ id: route.id }, null);
    await fireEvent.press(await screen.findByRole('button', { name: 'Voir des parcours proches' }));
    const framing = discoveryStore.getState().framing;
    const view = framing && framing.view !== 'home' ? framing.view : null;
    expect(view?.bbox.south).toBeLessThan(near.lat);
    expect(view?.bbox.north).toBeGreaterThan(near.lat);
    expect(view?.bbox.west).toBeLessThan(near.lng);
    expect(view?.bbox.east).toBeGreaterThan(near.lng);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it.each([
    [
      'cannot be reached',
      () => Promise.reject(new TypeError('Network request failed')),
      'Hors connexion',
    ],
    ['fails', async () => json(500, { code: 'internal_error', message: 'Failure' }), 'Erreur'],
  ])('shows the error state of the sheet when the API %s', async (_, answer, text) => {
    mockFetch.mockImplementation(answer);
    await renderRoute({ id: route.id }, null);
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Programmer' })).toBeNull();
  });
});
