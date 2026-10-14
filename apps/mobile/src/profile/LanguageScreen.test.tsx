import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me, UpdateMe } from '@widoo/shared';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { i18next } from '../i18n';
import { languageStore } from '../i18n/language';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { toastStore } from '../ui/toastStore';
import { LanguageScreen } from './LanguageScreen';
import { meQueryKey } from './me';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'fr' }] }));
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

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const updateMe = api.updateMe as jest.MockedFunction<(update: UpdateMe) => Promise<Me>>;

let client = new QueryClient();
afterEach(() => {
  client.clear();
  // The account set on the app's client keeps a garbage-collection timer otherwise.
  queryClient.clear();
});

async function renderScreen(me: Me | null = testMe()) {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  if (me) {
    client.setQueryData(meQueryKey(user.uid), me);
  }
  await render(
    <QueryClientProvider client={client}>
      <LanguageScreen />
    </QueryClientProvider>,
  );
}

describe('Réglages › Langue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    toastStore.setState({ toast: null });
    languageStore.set('device');
    await act(() => fakeAuth.setUser(user));
  });

  it('offers the phone language, checked by default, French and English', async () => {
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Langue' })).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Langue du téléphone, Français', checked: true }),
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Français', checked: false })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Anglais, English', checked: false })).toBeTruthy();
  });

  it('switches to English at once, and keeps it on the account', async () => {
    updateMe.mockResolvedValue(testMe({ locale: 'en' }));
    await renderScreen();
    await act(() => fireEvent.press(screen.getByRole('radio', { name: 'Anglais, English' })));
    expect(i18next.language).toBe('en');
    expect(screen.getByRole('header', { name: 'Language' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'English', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'French, Français' })).toBeTruthy();
    expect(updateMe).toHaveBeenCalledWith({ locale: 'en' });
  });

  it('sends null to follow the phone again', async () => {
    languageStore.set('en');
    updateMe.mockResolvedValue(testMe({ locale: null }));
    await renderScreen();
    await act(() => fireEvent.press(screen.getByRole('radio', { name: 'Phone language, French' })));
    expect(updateMe).toHaveBeenCalledWith({ locale: null });
    expect(i18next.language).toBe('fr');
  });

  it('goes back to the previous choice when the account refuses it', async () => {
    updateMe.mockRejectedValue(new Error('offline'));
    await renderScreen();
    await act(() => fireEvent.press(screen.getByRole('radio', { name: 'Anglais, English' })));
    expect(languageStore.get()).toBe('device');
    expect(i18next.language).toBe('fr');
    expect(toastStore.getState().toast?.title).toBe('Modification impossible');
  });

  it('keeps the choice on the phone only, without account', async () => {
    await act(() => fakeAuth.setUser(null));
    await renderScreen(null);
    await act(() => fireEvent.press(screen.getByRole('radio', { name: 'Anglais, English' })));
    expect(languageStore.get()).toBe('en');
    expect(updateMe).not.toHaveBeenCalled();
  });

  it('takes the language of the account when GET /me answers', async () => {
    await act(() => queryClient.setQueryData(meQueryKey(user.uid), testMe({ locale: 'en' })));
    expect(languageStore.get()).toBe('en');
    expect(i18next.language).toBe('en');
  });
});
