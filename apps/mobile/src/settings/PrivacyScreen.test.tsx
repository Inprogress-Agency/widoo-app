import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me, MyDataExport } from '@widoo/shared';
import { consent } from '../analytics';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { meQueryKey } from '../profile/me';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { toastStore } from '../ui/toastStore';
import { shareDataExport } from './dataExport';
import { PrivacyScreen } from './PrivacyScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('../ui/haptics', () => ({ haptic: jest.fn() }));
// The real consent store, on the in-memory MMKV of the tests.
jest.mock('../analytics', () => {
  const { useSyncExternalStore } = jest.requireActual<typeof import('react')>('react');
  const { createConsentStore } =
    jest.requireActual<typeof import('../analytics/consent')>('../analytics/consent');
  const values = new Map<string, string>();
  const store = createConsentStore({
    getString: (key) => values.get(key),
    set: (key, value) => void values.set(key, value),
  });
  return {
    consent: store,
    useConsent: () => useSyncExternalStore(store.subscribe, store.get),
    analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
  };
});
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../api/client', () => ({ api: { getMe: jest.fn(), exportMyData: jest.fn() } }));
jest.mock('./dataExport', () => ({ shareDataExport: jest.fn() }));

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const exportMyData = api.exportMyData as jest.MockedFunction<() => Promise<MyDataExport>>;
const share = shareDataExport as jest.MockedFunction<(data: MyDataExport) => Promise<void>>;
// The fictitious export the API would answer; its shape is checked by the API's tests.
const exported = { account: { email: 'camille@exemple.fr' } } as unknown as MyDataExport;

let client = new QueryClient();
afterEach(() => {
  client.clear();
  queryClient.clear();
  onlineManager.setOnline(true);
});

async function renderScreen(me: Me | null = testMe()) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  if (me) {
    client.setQueryData(meQueryKey(user.uid), me);
  }
  await render(
    <QueryClientProvider client={client}>
      <PrivacyScreen />
    </QueryClientProvider>,
  );
}

describe('Réglages › Confidentialité', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    toastStore.setState({ toast: null });
    consent.set('granted');
    await act(() => fakeAuth.setUser(user));
  });

  it('withdraws the consent at once, without confirmation', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('switch', { name: "Mesure d'audience", checked: true }));
    expect(consent.get()).toBe('denied');
    expect(screen.getByRole('switch', { name: "Mesure d'audience", checked: false })).toBeTruthy();
    expect(toastStore.getState().toast).toMatchObject({ title: "Mesure d'audience coupée" });
    await fireEvent.press(screen.getByRole('switch', { name: "Mesure d'audience" }));
    expect(consent.get()).toBe('granted');
  });

  it('downloads the data of the account into a file to share', async () => {
    exportMyData.mockResolvedValue(exported);
    share.mockResolvedValue();
    await renderScreen();
    await act(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Télécharger mes données' })),
    );
    expect(share).toHaveBeenCalledWith(exported);
    expect(screen.getByRole('button', { name: 'Télécharger mes données' })).toBeTruthy();
  });

  it('says when the download fails', async () => {
    exportMyData.mockRejectedValue(new Error('unreachable'));
    await renderScreen();
    await act(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Télécharger mes données' })),
    );
    expect(share).not.toHaveBeenCalled();
    expect(toastStore.getState().toast).toMatchObject({
      kind: 'error',
      title: 'Téléchargement impossible',
    });
  });

  it('keeps the button inactive offline, the switch still usable', async () => {
    await renderScreen();
    await act(() => onlineManager.setOnline(false));
    expect(
      screen.getByRole('button', { name: 'Télécharger mes données', disabled: true }),
    ).toBeTruthy();
    expect(
      screen.getByText('Hors connexion : reconnectez-vous pour télécharger vos données.'),
    ).toBeTruthy();
    expect(screen.getByRole('switch', { name: "Mesure d'audience", disabled: false })).toBeTruthy();
  });

  it('has no export without account', async () => {
    await act(() => fakeAuth.setUser(null));
    await renderScreen(null);
    expect(screen.queryByRole('button', { name: 'Télécharger mes données' })).toBeNull();
    expect(screen.getByText(/Sans compte, Widoo ne garde aucun profil/)).toBeTruthy();
  });
});
