import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { SupportMessageInput, SupportMessageReceipt } from '@widoo/shared';
import { router } from 'expo-router';
import { api } from '../api/client';
import { toastStore } from '../ui/toastStore';
import { clearContactDraft } from './contactDraft';
import { ContactScreen } from './ContactScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
let mockParams: { topic?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
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
jest.mock('../api/client', () => ({ api: { getMe: jest.fn(), sendSupportMessage: jest.fn() } }));

const send = api.sendSupportMessage as jest.MockedFunction<
  (message: SupportMessageInput) => Promise<SupportMessageReceipt>
>;

async function renderWith(node: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe('Nous écrire', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    clearContactDraft();
    toastStore.setState({ toast: null });
  });

  // Fictitious address, signed out: the reply address is typed.
  async function fill() {
    await fireEvent.changeText(screen.getByLabelText('Message'), 'La carte reste grise en 4G.');
    await fireEvent.changeText(
      screen.getByLabelText('E-mail de réponse'),
      'camille.fictive@example.com',
    );
  }

  it('keeps Envoyer inactive while the message is empty', async () => {
    await renderWith(<ContactScreen />);
    expect(screen.getByRole('button', { name: 'Envoyer', disabled: true })).toBeTruthy();
  });

  it('sends the message with its subject, then goes back with a toast', async () => {
    mockParams = { topic: 'data' };
    send.mockResolvedValue({
      id: '01890000-0000-7000-8000-000000000009',
      createdAt: '2026-10-15T10:00:00.000Z',
    });
    await renderWith(<ContactScreen />);
    expect(screen.getByRole('button', { name: 'Données', selected: true })).toBeTruthy();
    await fill();
    await act(() => fireEvent.press(screen.getByRole('button', { name: 'Envoyer' })));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'data',
        message: 'La carte reste grise en 4G.',
        replyEmail: 'camille.fictive@example.com',
        locale: 'fr',
      }),
    );
    expect(router.back).toHaveBeenCalled();
    expect(toastStore.getState().toast).toMatchObject({ kind: 'success', title: 'Message envoyé' });
  });

  it('keeps the message when sending fails', async () => {
    send.mockRejectedValue(new Error('unreachable'));
    await renderWith(<ContactScreen />);
    await fill();
    await act(() => fireEvent.press(screen.getByRole('button', { name: 'Envoyer' })));
    expect(toastStore.getState().toast).toMatchObject({ kind: 'error', title: 'Envoi impossible' });
    expect(screen.getByDisplayValue('La carte reste grise en 4G.')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('refuses an incomplete address under the field', async () => {
    await renderWith(<ContactScreen />);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Bonjour');
    await fireEvent.changeText(screen.getByLabelText('E-mail de réponse'), 'camille@');
    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer' }));
    // Read with the field, as its hint; drawn under it.
    expect(
      screen.getByText("Vérifiez l'adresse : elle semble incomplète.", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
  });
});
