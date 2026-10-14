import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Me } from '@widoo/shared';
import { analytics } from '../analytics';
import { signInFlow } from '../auth/signIn';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { meQueryKey } from './me';
import { ProfileScreen } from './ProfileScreen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
// The sheet mock of gorhom draws its content at once, modal: it would hide the screen.
jest.mock('./CertificationSheet', () => ({ CertificationSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: () => undefined,
}));
jest.mock('expo-router/tabs', () => ({
  BottomTabBarHeightContext: jest.requireActual<typeof import('react')>('react').createContext(0),
}));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../auth/signIn', () => ({ signInFlow: { requireAccount: jest.fn() } }));
// The profile on screen is the one in the cache: the API is not asked again within the test.
jest.mock('../api/client', () => ({ api: { getMe: jest.fn() } }));

const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };

// The account query keeps its 7 days of `gcTime` once unobserved: cleared after each test.
let client = new QueryClient();
afterEach(() => client.clear());

async function renderProfile(me: Me | null) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  if (me) {
    client.setQueryData(meQueryKey(user.uid), me);
  }
  await render(
    <QueryClientProvider client={client}>
      <ProfileScreen />
    </QueryClientProvider>,
  );
}

describe('E-09, my profile', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    await act(() => fakeAuth.setUser(user));
  });

  it('shows the profile as the others see it, the identity in one element', async () => {
    await renderProfile(testMe());
    expect(
      screen.getByLabelText('Camille, Créateur certifié, Paris 11e, sur Widoo depuis mars 2026'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifier le profil' })).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Mon quartier pour flâner. Le haut de Belleville, pour la vue sur tout Paris.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Canal Saint-Martin au fil de l’eau' })).toBeTruthy();
    // The e-mail lives in the settings only.
    expect(screen.queryByText('camille@exemple.fr')).toBeNull();
    // Figures, each one element.
    expect(screen.getByLabelText('23 parcours réalisés')).toBeTruthy();
    expect(screen.getByLabelText('Note moyenne 4,8 sur 5')).toBeTruthy();
  });

  it('opens the certification of my own profile with certified_info_opened', async () => {
    const me = testMe();
    await renderProfile(me);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Créateur certifié, en savoir plus' }),
    );
    expect(analytics.track).toHaveBeenCalledWith('certified_info_opened', {
      creator_id: me.id,
      own: true,
    });
  });

  it('says what the badge lacks to a creator not certified yet', async () => {
    const me = testMe({
      certification: {
        isCertified: false,
        certifiedAt: null,
        criteria: [
          { criterion: 'verifiedRoutes', value: 2, threshold: 3, isMet: false },
          { criterion: 'averageRating', value: 4.6, threshold: 4.5, isMet: true },
          { criterion: 'completedRoutes', value: 9, threshold: 3, isMet: true },
        ],
      },
    });
    await renderProfile(me);
    expect(
      screen.getByRole('button', {
        name: "Devenez créateur certifié. Plus qu'un parcours vérifié pour y arriver.",
      }),
    ).toBeTruthy();
  });

  it('says the profile is masked, with the way to the settings', async () => {
    await renderProfile(testMe({ isPublic: false }));
    expect(
      screen.getByLabelText('Votre profil est masqué. Vos parcours affichent « Membre Widoo ».'),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Modifier dans les réglages' })).toBeTruthy();
  });

  it('shows the profile kept on the phone offline, with its status line', async () => {
    onlineManager.setOnline(false);
    await renderProfile(testMe());
    expect(
      screen.getByLabelText('Hors connexion. Profil enregistré sur ce téléphone.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifier le profil' })).toBeTruthy();
  });

  it('asks a new account to complete its profile, and hides the Premium card from a subscriber', async () => {
    await renderProfile(
      testMe({ bio: null, neighborhood: null, anecdotes: [], featuredRoutes: [], plan: 'premium' }),
    );
    expect(screen.getByText('0 sur 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Écrivez une bio' })).toBeTruthy();
    expect(screen.queryByText('Widoo Premium')).toBeNull();
  });

  it('offers an account without one, through E-10', async () => {
    await act(() => fakeAuth.setUser(null));
    await renderProfile(null);
    expect(
      screen.getByRole('header', { name: 'Vos sorties, toutes au même endroit' }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte ou se connecter' }));
    expect(signInFlow.requireAccount).toHaveBeenCalledWith('profile', expect.any(Function));
  });
});
