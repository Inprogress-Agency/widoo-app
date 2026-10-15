import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { queryClient } from '../api/query-client';
import { fakeAuth } from '../test/fakeAuth';
import type { createFakeAccountApi } from '../test/fakeApi';
import { deleteAccount } from './me';
import { ProfileScreen } from './ProfileScreen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('./CertificationSheet', () => ({ CertificationSheet: () => null }));
// The tab focused for the whole test: as React Navigation does, the effect runs again whenever
// the callback it is given changes. A loop fails the test instead of spinning in `act`.
let mockFocusRuns = 0;
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) =>
      useEffect(() => {
        mockFocusRuns += 1;
        if (mockFocusRuns > 20) {
          throw new Error('The focus effect of the Profil tab runs in a loop');
        }
        effect();
      }, [effect]),
  };
});
jest.mock('expo-router/tabs', () => ({
  BottomTabBarHeightContext: jest.requireActual<typeof import('react')>('react').createContext(0),
}));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => {
  const { QueryClient } =
    jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  const { shouldRetry } = jest.requireActual<typeof import('../api/retry')>('../api/retry');
  return { queryClient: new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }) };
});
jest.mock('../auth/signIn', () => ({ signInFlow: { requireAccount: jest.fn() } }));
// The API client of the app, on a simulated API that counts its requests.
jest.mock('../api/client', () => {
  const { createFakeAccountApi } =
    jest.requireActual<typeof import('../test/fakeApi')>('../test/fakeApi');
  const { testMe } = jest.requireActual<typeof import('../test/me')>('../test/me');
  const { session } = jest.requireActual<typeof import('../auth')>('../auth');
  const fakeApi = createFakeAccountApi(testMe());
  return { api: fakeApi.clientFor(session), fakeApi };
});

const { fakeApi } = jest.requireMock<{ fakeApi: ReturnType<typeof createFakeAccountApi> }>(
  '../api/client',
);
const { server } = fakeApi;
const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };

/** Lets the requests and renders that follow run, as long as a loop would need to show. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));

async function renderSignedIn() {
  await act(() => fakeAuth.setUser(user));
  await render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('button', { name: 'Modifier le profil' })).toBeTruthy();
  await settle();
}

const signedOutProfile = () =>
  screen.findByRole('button', { name: 'Créer un compte ou se connecter' });

describe('GET /me on the Profil tab', () => {
  beforeEach(() => {
    mockFocusRuns = 0;
    onlineManager.setOnline(true);
    Object.assign(server, { getMeCount: 0, deleteMeCount: 0, isDeleted: false });
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await act(() => fakeAuth.setUser(null));
    queryClient.clear();
  });

  it('asks once at the opening of the tab, not at each render', async () => {
    await renderSignedIn();
    // The first request and the one of the focus: no more.
    expect(server.getMeCount).toBeLessThanOrEqual(2);
  });

  it('asks at most once after the deletion of the account', async () => {
    await renderSignedIn();
    const before = server.getMeCount;
    await act(() => deleteAccount());
    expect(await signedOutProfile()).toBeTruthy();
    await settle();
    expect(server.deleteMeCount).toBe(1);
    expect(server.getMeCount - before).toBeLessThanOrEqual(1);
  });
});
