import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import type { PlannedRoute } from '@widoo/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/client';
import { plannedFixture } from '../go/testPlanned';
import { fakeAuth } from '../test/fakeAuth';
import { MyRoutesScreen } from './MyRoutesScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useFocusEffect: () => undefined,
}));
jest.mock('expo-router/tabs', () => ({
  BottomTabBarHeightContext: jest.requireActual<typeof import('react')>('react').createContext(0),
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
  api: { listPlanned: jest.fn(), listMyRoutes: jest.fn() },
}));
jest.mock('../auth/signIn', () => ({ signInFlow: { requireAccount: jest.fn() } }));
jest.mock('../go/useGo', () => ({ useStartGo: () => jest.fn() }));
// The photos read the route sheet: not what these tests are about.
jest.mock('../route/useRouteSheet', () => ({
  useRouteSheet: () => ({ state: { status: 'loading', known: null } }),
}));

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const fixture = plannedFixture();
// A fictitious outing in three days, and one not done last week.
const upcoming: PlannedRoute = {
  ...fixture,
  status: 'planned',
  startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
};
const missed: PlannedRoute = {
  ...fixture,
  id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e40',
  status: 'missed',
  startsAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
};
const push = jest.mocked(router.push);
/** What the API lists by status: the outing to come, the one not done, nothing else. */
const byStatus: Partial<Record<PlannedRoute['status'], PlannedRoute[]>> = {
  planned: [upcoming],
  missed: [missed],
};

let client = new QueryClient();
afterEach(() => client.clear());

async function renderRoutes() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <MyRoutesScreen />
    </QueryClientProvider>,
  );
}

describe('E-08, the way to « Votre sortie »', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    jest.mocked(api.listPlanned).mockImplementation(async (params) => ({
      items: byStatus[params?.status ?? 'planned'] ?? [],
      nextCursor: null,
    }));
    jest.mocked(api.listMyRoutes).mockResolvedValue({ items: [], nextCursor: null });
    await act(() => fakeAuth.setUser(user));
  });

  it('opens « Votre sortie » from an outing to come, no longer the route sheet', async () => {
    await renderRoutes();
    await fireEvent.press(await screen.findByRole('link', { name: /^Parcours fictif, / }));
    expect(push).toHaveBeenCalledWith({ pathname: '/outing/[id]', params: { id: upcoming.id } });
  });

  it('reopens E-06 over the route sheet from « Reprogrammer » of an outing not done', async () => {
    await renderRoutes();
    await fireEvent.press(screen.getByLabelText('Passés, 3 sur 4'));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Reprogrammer, Parcours fictif' }),
    );
    expect(push).toHaveBeenCalledWith({
      pathname: '/route/[id]',
      params: { id: missed.routeId, reschedule: missed.id },
    });
  });
});
