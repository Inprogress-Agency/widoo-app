import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me, UpdateMe } from '@widoo/shared';
import { router } from 'expo-router';
import { api } from '../api/client';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { toastStore } from '../ui/toastStore';
import { meQueryKey } from './me';
import { SettingsScreen } from './SettingsScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('expo-router/tabs', () => ({
  BottomTabBarHeightContext: jest.requireActual<typeof import('react')>('react').createContext(0),
}));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'fr' }] }));
jest.mock('../ui/haptics', () => ({ haptic: jest.fn() }));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../api/client', () => ({
  api: { getMe: jest.fn(), updateMe: jest.fn(), deleteMe: jest.fn() },
}));

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const updateMe = api.updateMe as jest.MockedFunction<(update: UpdateMe) => Promise<Me>>;

// The account query keeps its 7 days of `gcTime` once unobserved: cleared after each test.
let client = new QueryClient();
afterEach(() => client.clear());

async function renderWith(ui: React.ReactElement, me: Me = testMe()) {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  client.setQueryData(meQueryKey(user.uid), me);
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Réglages', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    toastStore.setState({ toast: null });
    await act(() => fakeAuth.setUser(user));
  });

  it('shows the e-mail, and the Premium card to a free account', async () => {
    await renderWith(<SettingsScreen />);
    expect(screen.getByLabelText('E-mail, camille@exemple.fr')).toBeTruthy();
    expect(screen.getByText('Widoo Premium')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Réglages' })).toBeTruthy();
  });

  it('shows the subscription to a subscriber, with « Gérer » to the store', async () => {
    await renderWith(
      <SettingsScreen />,
      testMe({ plan: 'premium', planExpiresAt: '2026-10-12T08:00:00.000Z' }),
    );
    expect(screen.getByRole('header', { name: 'Abonnement' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: "Widoo Premium, Jusqu'au 12 octobre 2026, Gérer" }),
    ).toBeTruthy();
    expect(screen.queryByText('Découvrir les formules')).toBeNull();
  });

  it('hides my profile by its switch, in one PATCH /me', async () => {
    updateMe.mockResolvedValue(testMe({ isPublic: false }));
    await renderWith(<SettingsScreen />);
    const toggle = screen.getByRole('switch', { name: 'Profil public' });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(toggle);
    expect(updateMe).toHaveBeenCalledWith({ isPublic: false });
    expect(
      screen.getByRole('switch', { name: 'Profil public' }).props.accessibilityState,
    ).toMatchObject({ checked: false });
  });

  it('keeps to the preferences and the information without account', async () => {
    await act(() => fakeAuth.setUser(null));
    await renderWith(<SettingsScreen />);
    expect(screen.queryByText('Compte')).toBeNull();
    expect(screen.queryByText('Se déconnecter')).toBeNull();
    expect(screen.getByRole('link', { name: "Conditions d'utilisation" })).toBeTruthy();
    expect(screen.getByText("Vous n'êtes pas connecté")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Créer un compte ou se connecter' })).toBeTruthy();
  });

  it('opens the page of each row (E-19)', async () => {
    await renderWith(<SettingsScreen />);
    expect(screen.queryByText("Vous n'êtes pas connecté")).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'E-mail, camille@exemple.fr' }));
    expect(router.push).toHaveBeenCalledWith('/settings/email');
    await fireEvent.press(screen.getByRole('link', { name: 'Confidentialité' }));
    expect(router.push).toHaveBeenCalledWith('/settings/privacy');
  });
});
