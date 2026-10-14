import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me } from '@widoo/shared';
import { Alert, type AlertButton } from 'react-native';
import { api } from '../api/client';
import { session } from '../auth';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { toastStore } from '../ui/toastStore';
import { DeleteAccountScreen } from './DeleteAccountScreen';
import { meQueryKey } from './me';

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
const deleteMe = api.deleteMe as jest.MockedFunction<() => Promise<void>>;

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

/** Presses the button of the system alert named `text`. */
function pressInAlert(text: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === text)?.onPress?.();
}

describe('Supprimer mon compte', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    toastStore.setState({ toast: null });
    await act(() => fakeAuth.setUser(user));
  });

  it('asks the system alert, deletes, and comes back to the profile without account', async () => {
    deleteMe.mockResolvedValue(undefined);
    await renderWith(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Supprimer votre compte ?',
      'Vos parcours publiés restent en ligne, signés « Membre Widoo ». Cette action ne peut pas être annulée.',
      expect.any(Array),
    );
    expect(deleteMe).not.toHaveBeenCalled();
    await act(async () => pressInAlert('Supprimer'));
    expect(deleteMe).toHaveBeenCalledTimes(1);
    expect(session.store.getState().status).toBe('anonymous');
    const { router } = jest.requireMock<{ router: { dismissTo: jest.Mock } }>('expo-router');
    expect(router.dismissTo).toHaveBeenCalledWith('/profile');
    expect(toastStore.getState().toast).toMatchObject({
      kind: 'success',
      title: 'Votre compte est supprimé.',
    });
  });

  it('stays signed in when the deletion fails, with « Réessayer »', async () => {
    deleteMe.mockRejectedValue(new Error('offline'));
    await renderWith(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    await act(async () => pressInAlert('Supprimer'));
    expect(session.store.getState().status).toBe('signedIn');
    expect(toastStore.getState().toast).toMatchObject({
      kind: 'error',
      title: 'Suppression impossible',
      action: { label: 'Réessayer' },
    });
  });

  it('reminds a subscriber that the store subscription goes on', async () => {
    await renderWith(<DeleteAccountScreen />, testMe({ plan: 'premium' }));
    expect(
      screen.getByText(
        "Votre abonnement Premium continue tant que vous ne le résiliez pas dans l'App Store.",
      ),
    ).toBeTruthy();
  });
});
