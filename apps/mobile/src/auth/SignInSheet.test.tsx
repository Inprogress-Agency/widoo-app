import { describe, expect, it, jest } from '@jest/globals';
// After `@jest/globals`: the mock of gorhom, hoisted, needs `jest`.
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createFakeAuth } from '../test/fakeAuth';
import { createSignInFlow, type SignInFlowDeps } from './flow';
import { SignInError } from './provider';
import { SignInSheet } from './SignInSheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
// The button of the Google SDK is native: a plain pressable in its place.
jest.mock('@react-native-google-signin/google-signin', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  const GoogleSigninButton = (props: object) => <Pressable {...props} />;
  GoogleSigninButton.Size = { Wide: 1 };
  GoogleSigninButton.Color = { Light: 'light' };
  return { GoogleSigninButton };
});

async function renderSheet(overrides: Partial<SignInFlowDeps> = {}) {
  const auth = createFakeAuth();
  const flow = createSignInFlow({
    provider: auth.provider,
    isSignedIn: () => false,
    onSignedIn: () => undefined,
    endSession: async () => undefined,
    getFirstName: async () => null,
    saveFirstName: async () => undefined,
    pendingEmail: { get: () => null, set: () => undefined },
    trackPrompted: () => undefined,
    trackCompleted: () => undefined,
    onLinkResent: () => undefined,
    ...overrides,
  });
  await render(<SignInSheet flow={flow} />);
  return { flow, auth };
}

describe('SignInSheet', () => {
  it('opens again after a close on the veil, without dismissing the sheet twice', async () => {
    let onDismiss: () => void = () => undefined;
    const present = jest
      .spyOn(BottomSheetModal.prototype, 'present')
      .mockImplementation(function (this: { props: { onDismiss: () => void } }) {
        onDismiss = this.props.onDismiss;
      });
    const dismiss = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const { flow } = await renderSheet();
    await act(() => flow.requireAccount('profile', () => undefined));
    // gorhom closes the sheet on the veil, then tells it.
    await act(() => onDismiss());
    expect(flow.store.getState().isOpen).toBe(false);
    expect(dismiss).not.toHaveBeenCalled();
    await act(() => flow.requireAccount('plan', () => undefined));
    expect(present).toHaveBeenCalledTimes(2);
    present.mockRestore();
    dismiss.mockRestore();
  });

  it('says the action waiting, with Google, the e-mail and the conditions', async () => {
    const { flow } = await renderSheet();
    await act(() => flow.requireAccount('go', () => undefined));
    expect(
      screen.getByRole('header', { name: 'Connectez-vous pour lancer ce parcours' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Se connecter avec Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuer avec un e-mail' })).toBeTruthy();
    expect(screen.getByRole('link', { name: "conditions d'utilisation" })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toBeTruthy();
  });

  it('tells a failed sign-in above the buttons, which stay active', async () => {
    const { flow, auth } = await renderSheet();
    auth.provider.signInWithGoogle = async () => {
      throw new SignInError('failed', 'auth/internal-error');
    };
    await act(() => flow.requireAccount('favorite', () => undefined));
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter avec Google' }));
    expect(screen.getByLabelText("La connexion n'a pas abouti. Réessayez.")).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Continuer avec un e-mail' }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('sends the link once the address reads, then waits 30 s to send another', async () => {
    const { flow } = await renderSheet();
    await act(() => flow.requireAccount('favorite', () => undefined));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer avec un e-mail' }));
    const submit = () => screen.getByRole('button', { name: 'Recevoir le lien' });
    expect(submit().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText('Adresse e-mail'), 'camille@exemple.fr');
    expect(submit().props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(submit());
    expect(screen.getByRole('header', { name: 'Vérifiez vos e-mails' })).toBeTruthy();
    expect(screen.getByText('camille@exemple.fr')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Renvoyer dans 30 secondes' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(screen.getByRole('button', { name: "Changer d'adresse" })).toBeTruthy();
  });

  it('asks for a name after an e-mail sign-in, Continuer inactive while empty', async () => {
    const { flow } = await renderSheet({
      pendingEmail: {
        get: () => ({ email: 'c@exemple.fr', intent: 'favorite' }),
        set: () => undefined,
      },
    });
    await act(async () => {
      flow.openLink('https://widoo-test.firebaseapp.com/__/auth/links?link=fictitious');
    });
    expect(screen.getByRole('header', { name: 'Bienvenue sur Widoo' })).toBeTruthy();
    const submit = () => screen.getByRole('button', { name: 'Continuer' });
    expect(submit().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText('Prénom ou pseudo'), 'Camille');
    expect(submit().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('tells an expired link, with a new one to receive', async () => {
    const { flow, auth } = await renderSheet({
      pendingEmail: { get: () => ({ email: 'c@exemple.fr', intent: null }), set: () => undefined },
    });
    auth.provider.signInWithEmailLink = async () => {
      throw new SignInError('expired', 'auth/invalid-action-code');
    };
    await act(async () => {
      flow.openLink('https://widoo-test.firebaseapp.com/__/auth/links?link=fictitious');
    });
    expect(screen.getByRole('header', { name: "Ce lien n'est plus valable" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recevoir un nouveau lien' })).toBeTruthy();
  });
});
