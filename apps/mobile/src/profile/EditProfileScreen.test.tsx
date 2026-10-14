import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me, UpdateMe } from '@widoo/shared';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { toastStore } from '../ui/toastStore';
import { EditProfileScreen } from './EditProfileScreen';
import { meQueryKey } from './me';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
// The sheet mock of gorhom draws its content at once, modal: it would hide the page.
jest.mock('./AnecdoteSheet', () => ({ AnecdoteSheet: () => null }));
const mockPreventRemove = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (isPrevented: boolean) => mockPreventRemove(isPrevented),
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
  api: { getMe: jest.fn(), getConfig: jest.fn(), updateMe: jest.fn() },
}));

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const updateMe = api.updateMe as jest.MockedFunction<(update: UpdateMe) => Promise<Me>>;

// The account query keeps its 7 days of `gcTime` once unobserved: cleared after each test.
let client = new QueryClient();
afterEach(() => client.clear());

async function renderEdit(me = testMe()) {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  client.setQueryData(meQueryKey(user.uid), me);
  client.setQueryData(['config'], { anecdoteQuestions: [] });
  await render(
    <QueryClientProvider client={client}>
      <EditProfileScreen />
    </QueryClientProvider>,
  );
}

describe('Modifier le profil', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    toastStore.setState({ toast: null });
    await act(() => fakeAuth.setUser(user));
  });

  it('saves the changed fields in one PATCH /me, then goes back with its toast', async () => {
    await renderEdit();
    updateMe.mockResolvedValue(testMe({ bio: 'Nouvelle bio.' }));
    await fireEvent.changeText(screen.getByLabelText('Bio'), 'Nouvelle bio.');
    expect(mockPreventRemove).toHaveBeenLastCalledWith(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(updateMe).toHaveBeenCalledWith({ bio: 'Nouvelle bio.' });
    expect(analytics.track).toHaveBeenCalledWith('profile_updated', { fields: ['bio'] });
    expect(toastStore.getState().toast).toMatchObject({
      kind: 'success',
      title: 'Profil enregistré.',
      isAboveTabBar: true,
    });
  });

  it('keeps the changes on screen after a failure, with « Réessayer »', async () => {
    await renderEdit();
    updateMe.mockRejectedValue(new Error('offline'));
    await fireEvent.changeText(screen.getByLabelText('Quartier'), 'Paris 20e');
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(toastStore.getState().toast).toMatchObject({
      kind: 'error',
      title: 'Enregistrement impossible',
      subtitle: "Rien n'est perdu.",
      action: { label: 'Réessayer' },
    });
    expect(screen.getByDisplayValue('Paris 20e')).toBeTruthy();
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('shows the error under the field instead of sending it', async () => {
    await renderEdit();
    await fireEvent.changeText(screen.getByLabelText('Prénom ou pseudo'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(screen.getByLabelText('Prénom ou pseudo').props.accessibilityHint).toBe(
      'Indiquez un prénom ou un pseudo de 50 caractères au plus.',
    );
    expect(
      screen.getByText('Indiquez un prénom ou un pseudo de 50 caractères au plus.', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(updateMe).not.toHaveBeenCalled();
  });

  it('orders the anecdotes by « Monter » and « Descendre », without a gesture', async () => {
    await renderEdit();
    const first = screen.getByLabelText(
      'Mon quartier pour flâner, Le haut de Belleville, pour la vue sur tout Paris.',
    );
    expect(first.props.accessibilityActions.map((action: { name: string }) => action.name)).toEqual(
      ['activate', 'moveDown'],
    );
    await fireEvent(first, 'accessibilityAction', { nativeEvent: { actionName: 'moveDown' } });
    updateMe.mockResolvedValue(testMe());
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(updateMe.mock.calls[0]?.[0].anecdotes?.map((anecdote) => anecdote.questionKey)).toEqual([
      'ideal_sunday',
      'stroll_neighborhood',
    ]);
    expect(analytics.track).toHaveBeenCalledWith('profile_updated', { fields: ['anecdotes'] });
  });

  it('removes a featured route by its cross, and counts the field', async () => {
    await renderEdit();
    // Two of three anecdotes, two of three featured routes.
    expect(screen.getAllByText('2 sur 3')).toHaveLength(2);
    await fireEvent.press(screen.getByLabelText('Retirer Galeries et passages secrets du 2e'));
    updateMe.mockResolvedValue(testMe());
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(updateMe).toHaveBeenCalledWith({
      featuredRouteIds: [testMe().featuredRoutes[0]?.id],
    });
  });

  it('closes at once without a change: nothing to abandon', async () => {
    await renderEdit();
    expect(mockPreventRemove).toHaveBeenLastCalledWith(false);
  });
});
