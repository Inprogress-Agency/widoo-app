import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { RouteDetail, type PlannedRoute } from '@widoo/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import RouteScreen from '../../app/route/[id]';
import { analytics } from '../analytics';
import { api } from '../api/client';
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
jest.mock('../api/client', () => ({
  api: { listPlanned: jest.fn(), updatePlanned: jest.fn(), createPlanned: jest.fn() },
}));
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
    }: {
      state: { status: string; route?: unknown };
      onPlan: (route: unknown) => void;
    }) =>
      state.status === 'ready' ? (
        <Pressable accessibilityRole="button" onPress={() => onPlan(state.route)}>
          <Text>Programmer</Text>
        </Pressable>
      ) : null,
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

async function renderRoute(params: Record<string, string>) {
  mockParams = params;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <RouteSheetSourceContext value={source}>
        <RouteScreen />
      </RouteSheetSourceContext>
    </QueryClientProvider>,
  );
}

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
