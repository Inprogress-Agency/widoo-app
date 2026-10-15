import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import type { Me } from '@widoo/shared';
import type { AuthUser } from '../auth/provider';
import { queryClient } from '../api/query-client';
import { meQueryKey } from '../profile/me';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { EmailScreen, SignInMethodScreen } from './AccountScreens';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../api/client', () => ({ api: { getMe: jest.fn() } }));

const user: AuthUser = { uid: 'uid-1', email: null, displayName: null, provider: 'google' };

let client = new QueryClient();
afterEach(() => {
  client.clear();
  queryClient.clear();
});

async function renderWith(ui: React.ReactElement, me: Me) {
  client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, staleTime: Infinity } },
  });
  client.setQueryData(meQueryKey(user.uid), me);
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Réglages › E-mail et Connexion', () => {
  beforeEach(async () => {
    await act(() => fakeAuth.setUser(user));
  });

  it('shows the address of the account', async () => {
    await renderWith(<EmailScreen />, testMe());
    expect(screen.getByRole('header', { name: 'E-mail' })).toBeTruthy();
    expect(screen.getByLabelText('camille@exemple.fr, Adresse actuelle')).toBeTruthy();
  });

  it('hides the relay of Apple', async () => {
    await renderWith(<EmailScreen />, testMe({ email: 'x7k2fictif@privaterelay.appleid.com' }));
    expect(screen.getByLabelText('Masquée par Apple, Adresse actuelle')).toBeTruthy();
    expect(screen.queryByText(/privaterelay/)).toBeNull();
  });

  it('tells the method of the account, read only', async () => {
    await renderWith(<SignInMethodScreen />, testMe());
    expect(screen.getByLabelText('Google, Vous vous connectez avec Google.')).toBeTruthy();
    expect(screen.getByText(/choisissez « Se connecter avec Google »/)).toBeTruthy();
  });
});
