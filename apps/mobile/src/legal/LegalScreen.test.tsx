import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { AppLocale, LegalDoc, LegalDocument } from '@widoo/shared';
import { api } from '../api/client';
import { LegalScreen } from './LegalScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('../api/client', () => ({ api: { getLegalDocument: jest.fn() } }));

const getLegalDocument = api.getLegalDocument as jest.MockedFunction<
  (doc: LegalDoc, locale: AppLocale) => Promise<LegalDocument>
>;

const served: LegalDocument = {
  doc: 'terms',
  version: '2026-10-15',
  updatedAt: '2026-10-15T00:00:00.000Z',
  locale: 'fr',
  title: "Conditions d'utilisation de Widoo",
  sections: [{ title: '1. Nouvel article', body: 'Texte **servi** par l’API.' }],
};

async function renderScreen(doc: LegalDoc, backTo?: 'settings' | 'home') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <LegalScreen doc={doc} backTo={backTo} />
    </QueryClientProvider>,
  );
}

describe('Textes légaux', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens on the copy shipped with the app, without network', async () => {
    getLegalDocument.mockRejectedValue(new Error('offline'));
    await renderScreen('privacy');
    expect(
      screen.getByRole('header', { name: 'Politique de confidentialité de Widoo' }),
    ).toBeTruthy();
    expect(screen.getByRole('header', { name: "L'essentiel" })).toBeTruthy();
    expect(screen.getByText('Mise à jour le 28 septembre 2026')).toBeTruthy();
    expect(getLegalDocument).toHaveBeenCalledWith('privacy', 'fr', expect.anything());
  });

  it('takes the text the API serves, articles as headers', async () => {
    getLegalDocument.mockResolvedValue(served);
    await renderScreen('terms');
    expect(await screen.findByRole('header', { name: '1. Nouvel article' })).toBeTruthy();
    expect(screen.getByText('Mise à jour le 15 octobre 2026')).toBeTruthy();
    expect(screen.queryByRole('header', { name: "L'essentiel" })).toBeNull();
  });

  it.each<['settings' | 'home' | undefined, string]>([
    [undefined, 'Retour aux réglages'],
    ['home', "Retour à l'accueil"],
  ])('names where its back button goes (%s)', async (backTo, label) => {
    getLegalDocument.mockRejectedValue(new Error('offline'));
    await renderScreen('privacy', backTo);
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  });
});
