import { ApiRequestError } from '@widoo/api-client';
import { describe, expect, it, vi } from 'vitest';
import { createFakeAuth } from '../test/fakeAuth';
import { createSignInFlow, type PendingEmail, type SignInFlowDeps } from './flow';
import { SignInError, type SignInResult } from './provider';

const googleResult: SignInResult = {
  user: { uid: 'uid-g', email: 'camille@exemple.fr', displayName: 'Camille Martin' },
  method: 'google',
  isNewUser: false,
};
const link = 'https://widoo-test.firebaseapp.com/__/auth/links?link=fictitious';

function setup(overrides: Partial<SignInFlowDeps> = {}) {
  const auth = createFakeAuth();
  let signedIn = false;
  let kept: PendingEmail | null = null;
  const deps: SignInFlowDeps = {
    provider: auth.provider,
    isSignedIn: () => signedIn,
    onSignedIn: vi.fn(),
    endSession: vi.fn(async () => {
      signedIn = false;
    }),
    getFirstName: vi.fn(async () => 'Camille'),
    saveFirstName: vi.fn(async () => undefined),
    pendingEmail: { get: () => kept, set: (value) => (kept = value) },
    trackPrompted: vi.fn(),
    trackCompleted: vi.fn(),
    onLinkResent: vi.fn(),
    now: () => 1_000,
    ...overrides,
  };
  const flow = createSignInFlow(deps);
  return {
    flow,
    deps,
    auth,
    state: () => flow.store.getState(),
    signIn: () => (signedIn = true),
    kept: () => kept,
  };
}

describe('sign-in flow', () => {
  it('runs the action at once for an account with a name', async () => {
    const { flow, signIn, deps } = setup();
    signIn();
    const action = vi.fn();
    await flow.requireAccount('favorite', action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(deps.trackPrompted).not.toHaveBeenCalled();
  });

  it('opens on the three choices, then resumes the action after Google', async () => {
    const { flow, deps, auth, state } = setup();
    const action = vi.fn();
    await flow.requireAccount('go', action);
    expect(state()).toMatchObject({ isOpen: true, intent: 'go', step: 'choices' });
    expect(deps.trackPrompted).toHaveBeenCalledWith('go');
    auth.provider.signInWithGoogle = async () => googleResult;
    await flow.signInWithGoogle();
    expect(deps.onSignedIn).toHaveBeenCalledWith(googleResult.user);
    expect(deps.trackCompleted).toHaveBeenCalledWith(googleResult, 'go');
    expect(action).toHaveBeenCalledTimes(1);
    expect(state().isOpen).toBe(false);
  });

  it('shows nothing when the Google window is closed, and the error line on a failure', async () => {
    const { flow, auth, state } = setup();
    await flow.requireAccount('favorite', vi.fn());
    await flow.signInWithGoogle();
    expect(state()).toMatchObject({ isOpen: true, step: 'choices', error: null, isBusy: false });
    auth.provider.signInWithGoogle = async () => {
      throw new SignInError('offline', 'auth/network-request-failed');
    };
    await flow.signInWithGoogle();
    expect(state().error).toBe('offline');
  });

  it('offers to skip the name prefilled by Google on a new account, and resumes on close', async () => {
    const { flow, auth, state } = setup();
    const action = vi.fn();
    await flow.requireAccount('favorite', action);
    auth.provider.signInWithGoogle = async () => ({ ...googleResult, isNewUser: true });
    await flow.signInWithGoogle();
    expect(state()).toMatchObject({
      step: 'welcome',
      welcome: { firstName: 'Camille', isRequired: false, isPrefilled: true },
    });
    flow.dismiss();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('sends the link, keeps the address, and signs in with it when the link opens', async () => {
    const { flow, deps, state, kept } = setup({ getFirstName: vi.fn(async () => null) });
    const action = vi.fn();
    await flow.requireAccount('favorite', action);
    flow.chooseEmail();
    await flow.submitEmail(' camille@exemple.fr ');
    expect(state()).toMatchObject({ step: 'sent', email: 'camille@exemple.fr', sentAt: 1_000 });
    expect(kept()).toEqual({ email: 'camille@exemple.fr', intent: 'favorite' });

    expect(flow.openLink('https://widooapp.com/r/route-1')).toBe(false);
    expect(flow.openLink(link)).toBe(true);
    await vi.waitFor(() => expect(state().step).toBe('welcome'));
    expect(deps.trackCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'email', isNewUser: true }),
      'favorite',
    );
    expect(state().welcome).toEqual({ firstName: '', isRequired: true, isPrefilled: false });
    // Required: closing does not resume the action.
    flow.dismiss();
    expect(action).not.toHaveBeenCalled();
  });

  it('saves the name, then resumes the action', async () => {
    const { flow, deps, state } = setup({ getFirstName: vi.fn(async () => null) });
    const action = vi.fn();
    await flow.requireAccount('favorite', action);
    flow.chooseEmail();
    await flow.submitEmail('camille@exemple.fr');
    flow.openLink(link);
    await vi.waitFor(() => expect(state().step).toBe('welcome'));
    await flow.saveFirstName(' Camille ');
    expect(deps.saveFirstName).toHaveBeenCalledWith('Camille');
    expect(action).toHaveBeenCalledTimes(1);
    expect(state().isOpen).toBe(false);
  });

  it('asks for the address of a link sent from another device', async () => {
    const { flow, state, auth } = setup();
    const signInWithEmailLink = vi.spyOn(auth.provider, 'signInWithEmailLink');
    flow.openLink(link);
    expect(state()).toMatchObject({ isOpen: true, step: 'email', pendingLink: link });
    await flow.submitEmail('camille@exemple.fr');
    expect(signInWithEmailLink).toHaveBeenCalledWith('camille@exemple.fr', link);
  });

  it('tells an expired link, and sends a new one with the toast', async () => {
    const { flow, deps, auth, state } = setup();
    await flow.requireAccount('favorite', vi.fn());
    flow.chooseEmail();
    await flow.submitEmail('camille@exemple.fr');
    auth.provider.signInWithEmailLink = async () => {
      throw new SignInError('expired', 'auth/invalid-action-code');
    };
    flow.openLink(link);
    await vi.waitFor(() => expect(state().step).toBe('expired'));
    await flow.resend();
    expect(state().step).toBe('sent');
    expect(deps.onLinkResent).toHaveBeenCalledTimes(1);
  });

  it('drops the action when the sheet is closed', async () => {
    const { flow, auth, state } = setup();
    const action = vi.fn();
    await flow.requireAccount('favorite', action);
    flow.dismiss();
    auth.provider.signInWithGoogle = async () => googleResult;
    await flow.signInWithGoogle();
    expect(action).not.toHaveBeenCalled();
    expect(state().isOpen).toBe(false);
  });

  it('brings back the name step of an e-mail account left before it', async () => {
    const { flow, signIn, state } = setup({ getFirstName: vi.fn(async () => null) });
    signIn();
    const action = vi.fn();
    await flow.requireAccount('go', action);
    expect(state()).toMatchObject({ isOpen: true, step: 'welcome' });
    expect(action).not.toHaveBeenCalled();
  });

  it('opens the sheet for an account deleted, never runs the action as signed in', async () => {
    const deleted = new ApiRequestError('http', 401, {
      code: 'unauthorized',
      message: 'Account deleted',
    });
    const { flow, deps, signIn, state } = setup({
      getFirstName: vi.fn(async () => Promise.reject(deleted)),
    });
    signIn();
    const action = vi.fn();
    await flow.requireAccount('plan', action);
    expect(deps.endSession).toHaveBeenCalledTimes(1);
    expect(state()).toMatchObject({ isOpen: true, intent: 'plan', step: 'choices' });
    expect(deps.trackPrompted).toHaveBeenCalledWith('plan');
    expect(action).not.toHaveBeenCalled();
  });

  it('runs the action when /me is out of reach, without ending the session', async () => {
    const offline = new ApiRequestError('network', null, null);
    const { flow, deps, signIn } = setup({
      getFirstName: vi.fn(async () => Promise.reject(offline)),
    });
    signIn();
    const action = vi.fn();
    await flow.requireAccount('plan', action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(deps.endSession).not.toHaveBeenCalled();
  });
});
