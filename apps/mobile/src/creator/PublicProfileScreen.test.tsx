import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ApiRequestError, type PublicProfileAnswer } from '@widoo/api-client';
import type { Me } from '@widoo/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { meQueryKey } from '../profile/me';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { testMinimalProfile, testPublicProfile } from '../test/publicProfile';
import { PublicProfileScreen } from './PublicProfileScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
// The sheet mock of gorhom draws its content at once, modal: it would hide the screen.
jest.mock('../profile/CertificationSheet', () => ({ CertificationSheet: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), dismissTo: jest.fn() } }));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../api/client', () => ({ api: { getMe: jest.fn(), getPublicProfile: jest.fn() } }));

const getPublicProfile = jest.mocked(api.getPublicProfile);
const known = { firstName: 'Camille', avatarUrl: null };
const user = { uid: 'uid-1', email: null, displayName: null };

let client = new QueryClient();
afterEach(() => client.clear());

async function renderProfile(
  answer: Promise<PublicProfileAnswer>,
  { id = testPublicProfile().id, me }: { id?: string; me?: Me } = {},
) {
  getPublicProfile.mockReturnValue(answer);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  if (me) {
    // My account is the one in the cache: the API is not asked again within the test.
    client.setQueryData(meQueryKey(user.uid), me);
    client.setQueryDefaults(meQueryKey(user.uid), { staleTime: Infinity });
  }
  await render(
    <QueryClientProvider client={client}>
      <PublicProfileScreen id={id} known={known} onBack={jest.fn()} />
    </QueryClientProvider>,
  );
}

const ready = (profile = testPublicProfile()) =>
  Promise.resolve<PublicProfileAnswer>({ kind: 'profile', profile });

describe('E-16, the public profile of a creator', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    await act(() => fakeAuth.setUser(null));
  });

  it('shows the profile without « Modifier le profil », its figures and anecdotes', async () => {
    await renderProfile(ready());
    expect(
      await screen.findByLabelText(
        'Camille, Créateur certifié, Paris 11e, sur Widoo depuis mars 2026',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifier le profil' })).toBeNull();
    expect(screen.getByLabelText('8 parcours publiés')).toBeTruthy();
    expect(screen.getByLabelText('23 parcours réalisés')).toBeTruthy();
    expect(screen.getByLabelText('Note moyenne 4,8 sur 5')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Mon quartier pour flâner. Le haut de Belleville, pour la vue sur tout Paris.',
      ),
    ).toBeTruthy();
  });

  it('opens « Créateur certifié » for a visitor with certified_info_opened, own false', async () => {
    await renderProfile(ready());
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Créateur certifié, en savoir plus' }),
    );
    expect(analytics.track).toHaveBeenCalledWith('certified_info_opened', {
      creator_id: testPublicProfile().id,
      own: false,
    });
  });

  it('sends own true when the creator opens the certification of their own profile', async () => {
    const me = testMe();
    await act(() => fakeAuth.setUser(user));
    await renderProfile(ready(testPublicProfile({ id: me.id })), { id: me.id, me });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Créateur certifié, en savoir plus' }),
    );
    expect(analytics.track).toHaveBeenCalledWith('certified_info_opened', {
      creator_id: me.id,
      own: true,
    });
  });

  it('shows the minimal profile: one route published, without badge', async () => {
    await renderProfile(ready(testMinimalProfile()));
    expect(await screen.findByLabelText('Camille, Sur Widoo depuis mars 2026')).toBeTruthy();
    expect(screen.getByLabelText('1 parcours publié')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Créateur certifié, en savoir plus' })).toBeNull();
  });

  it('shows the known first name while loading, the rest busy', async () => {
    await renderProfile(new Promise<PublicProfileAnswer>(() => undefined));
    expect(screen.getByLabelText('Camille')).toBeTruthy();
    expect(screen.getByLabelText('Chargement du profil')).toBeTruthy();
  });

  it('says a masked profile or a deleted account is not available, with the way home', async () => {
    await renderProfile(Promise.resolve<PublicProfileAnswer>({ kind: 'unavailable' }));
    expect(
      await screen.findByLabelText(
        "Ce profil n'est pas disponible. Il a été masqué ou le compte a été supprimé.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Explorer les parcours' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('keeps the first name above « Hors connexion » offline, with « Réessayer »', async () => {
    await renderProfile(Promise.reject(new ApiRequestError('network', null, null)));
    expect(
      await screen.findByLabelText("Hors connexion. Le profil s'affichera au retour du réseau."),
    ).toBeTruthy();
    expect(screen.getByLabelText('Camille')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });
});
