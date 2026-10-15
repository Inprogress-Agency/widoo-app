import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me, UpdateMe } from '@widoo/shared';
import { Linking } from 'react-native';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { meQueryKey } from '../profile/me';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { toastStore } from '../ui/toastStore';
import { NotificationsScreen } from './NotificationsScreen';
import { usePhoneNotifications, type PhoneNotifications } from './phoneNotifications';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('../ui/haptics', () => ({ haptic: jest.fn() }));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../api/client', () => ({ api: { getMe: jest.fn(), updateMe: jest.fn() } }));
jest.mock('./phoneNotifications', () => ({ usePhoneNotifications: jest.fn() }));

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const updateMe = api.updateMe as jest.MockedFunction<(update: UpdateMe) => Promise<Me>>;
const phone = usePhoneNotifications as jest.MockedFunction<() => PhoneNotifications>;

let client = new QueryClient();
afterEach(() => {
  client.clear();
  queryClient.clear();
});

async function renderScreen(me: Me = testMe()) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  client.setQueryData(meQueryKey(user.uid), me);
  await render(
    <QueryClientProvider client={client}>
      <NotificationsScreen />
    </QueryClientProvider>,
  );
}

describe('Réglages › Notifications', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    toastStore.setState({ toast: null });
    phone.mockReturnValue('on');
    await act(() => fakeAuth.setUser(user));
  });

  it('shows one switch per kind, with the state of the account', async () => {
    await renderScreen(
      testMe({ notificationPrefs: { reminders: true, nextDay: false, myRoutes: true } }),
    );
    expect(screen.getByRole('header', { name: 'Notifications' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Rappels de sortie', checked: true })).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: "Le lendemain d'une sortie", checked: false }),
    ).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Vos parcours et signalements', checked: true }),
    ).toBeTruthy();
    expect(screen.queryByText('Ouvrir les réglages')).toBeNull();
  });

  it('keeps a switch on the account at once', async () => {
    updateMe.mockResolvedValue(
      testMe({ notificationPrefs: { reminders: false, nextDay: true, myRoutes: true } }),
    );
    await renderScreen();
    await act(() => fireEvent.press(screen.getByRole('switch', { name: 'Rappels de sortie' })));
    expect(updateMe).toHaveBeenCalledWith({ notificationPrefs: { reminders: false } });
    expect(screen.getByRole('switch', { name: 'Rappels de sortie', checked: false })).toBeTruthy();
  });

  it('goes back to its state when the API refuses it', async () => {
    updateMe.mockRejectedValue(new Error('refused'));
    await renderScreen();
    await act(() => fireEvent.press(screen.getByRole('switch', { name: 'Rappels de sortie' })));
    expect(screen.getByRole('switch', { name: 'Rappels de sortie', checked: true })).toBeTruthy();
    expect(toastStore.getState().toast).toMatchObject({
      kind: 'error',
      title: 'Modification impossible',
    });
  });

  it('says when the phone cuts them, opens its settings, and keeps the switches inactive', async () => {
    phone.mockReturnValue('off');
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderScreen();
    expect(
      await screen.findByText('Les notifications sont coupées dans les réglages du téléphone.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Rappels de sortie', checked: true, disabled: true }),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('link', { name: 'Ouvrir les réglages' }));
    expect(openSettings).toHaveBeenCalled();
  });
});
