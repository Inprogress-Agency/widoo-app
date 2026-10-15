import { isAccountDeleted } from '@widoo/api-client';
import type { AnalyticsEventArgs } from '@widoo/shared';
import { createStore } from 'zustand/vanilla';
import {
  SignInError,
  type AuthProvider,
  type AuthUser,
  type SignInFailure,
  type SignInResult,
} from './provider';

/** Why the sheet opens: the action waiting for an account (`auth_prompted`, D-033). */
export type AuthIntent = AnalyticsEventArgs<'auth_prompted'>[0]['intent'];

/** Steps of the sheet E-10, in its single modal (M-05). */
export type SignInStep = 'choices' | 'email' | 'sent' | 'welcome' | 'expired';

export interface SignInFlowState {
  isOpen: boolean;
  intent: AuthIntent | null;
  step: SignInStep;
  /** The line above the buttons after a failure (Ecrans › E-10, erreur). */
  error: SignInFailure | null;
  /** The address the link goes to, as typed. */
  email: string;
  /**
   * A link opened without the address this phone sent it to (another device): the e-mail step
   * confirms the address, then signs in (Firebase asks for it).
   */
  pendingLink: string | null;
  /** When the last link was sent: « Renvoyer dans 30 s » counts from it. */
  sentAt: number | null;
  /** First sign-in: the name to show, prefilled by Google; required after an e-mail sign-in. */
  welcome: { firstName: string; isRequired: boolean; isPrefilled: boolean } | null;
  isBusy: boolean;
}

/** The address the link was sent to, kept on the device until it is opened (Firebase). */
export interface PendingEmail {
  email: string;
  intent: AuthIntent | null;
}

export interface SignInFlowDeps {
  provider: AuthProvider;
  isSignedIn: () => boolean;
  /** A sign-in went through: the session takes its user before `/me` is asked. */
  onSignedIn: (user: AuthUser) => void;
  /** The account was deleted (401 « Account deleted »): the app becomes anonymous. */
  endSession: () => Promise<void>;
  /** `firstName` of `/me`, created on the first call; null when the account has none yet. */
  getFirstName: () => Promise<string | null>;
  saveFirstName: (firstName: string) => Promise<void>;
  pendingEmail: { get: () => PendingEmail | null; set: (value: PendingEmail | null) => void };
  trackPrompted: (intent: AuthIntent) => void;
  trackCompleted: (result: SignInResult, intent: AuthIntent) => void;
  /** Toast « Nouveau lien envoyé » (M-06). */
  onLinkResent: () => void;
  now?: () => number;
}

const closed: SignInFlowState = {
  isOpen: false,
  intent: null,
  step: 'choices',
  error: null,
  email: '',
  pendingLink: null,
  sentAt: null,
  welcome: null,
  isBusy: false,
};

const failureOf = (error: unknown): SignInFailure =>
  error instanceof SignInError ? error.failure : 'failed';

/**
 * The sign-in of E-10, from the action that asks for an account to that action done: the sheet
 * opens on the three choices, goes through the e-mail or Google, the first sign-in, and closes;
 * the action then resumes by itself (D-029, D-033). Closing the sheet drops the action: nothing
 * is saved.
 */
export function createSignInFlow(deps: SignInFlowDeps) {
  const now = deps.now ?? Date.now;
  const store = createStore<SignInFlowState>(() => closed);
  let pendingAction: (() => void) | null = null;
  /** Whether the account has its name: unknown until `/me` answered for this session. */
  let hasFirstName: boolean | null = null;
  const set = (patch: Partial<SignInFlowState>) => store.setState(patch);

  function finish() {
    const action = pendingAction;
    pendingAction = null;
    store.setState(closed);
    action?.();
  }

  /** The name step when the account has none; else the action. */
  async function afterSignIn(result: SignInResult | null) {
    let firstName: string | null;
    try {
      firstName = await deps.getFirstName();
    } catch {
      // `/me` unreachable: the name is asked at the next action that needs an account.
      hasFirstName = null;
      finish();
      return;
    }
    hasFirstName = firstName !== null;
    const isNew = result?.isNewUser ?? false;
    if (firstName === null || (isNew && result?.method === 'google')) {
      set({
        isOpen: true,
        step: 'welcome',
        error: null,
        isBusy: false,
        // Google gives a name, which the API keeps: the step can be skipped (App Review).
        welcome: {
          firstName: firstName ?? '',
          isRequired: firstName === null,
          isPrefilled: firstName !== null,
        },
      });
      return;
    }
    finish();
  }

  async function signedIn(result: SignInResult) {
    const intent = store.getState().intent ?? deps.pendingEmail.get()?.intent ?? null;
    deps.pendingEmail.set(null);
    deps.onSignedIn(result.user);
    if (intent) {
      deps.trackCompleted(result, intent);
    }
    await afterSignIn(result);
  }

  async function send(email: string, isResend: boolean) {
    set({ isBusy: true, error: null });
    try {
      await deps.provider.sendEmailLink(email);
      deps.pendingEmail.set({ email, intent: store.getState().intent });
      set({ isBusy: false, step: 'sent', email, sentAt: now() });
      if (isResend) {
        deps.onLinkResent();
      }
    } catch (error) {
      set({ isBusy: false, error: failureOf(error) });
    }
  }

  async function signInWithLink(email: string, url: string) {
    set({ isOpen: true, isBusy: true, error: null, email });
    try {
      await signedIn(await deps.provider.signInWithEmailLink(email, url));
    } catch (error) {
      const failure = failureOf(error);
      set(
        failure === 'expired'
          ? { isBusy: false, step: 'expired', pendingLink: null }
          : { isBusy: false, step: 'choices', error: failure },
      );
    }
  }

  return {
    store,

    /**
     * Runs `action` once the user is signed in with a name: at once when it is so, after the
     * sheet otherwise.
     */
    async requireAccount(intent: AuthIntent, action: () => void) {
      if (deps.isSignedIn() && hasFirstName === null) {
        try {
          hasFirstName = (await deps.getFirstName()) !== null;
        } catch (error) {
          if (!isAccountDeleted(error)) {
            // Offline: the action tells its own failure; the name waits for the next one.
            action();
            return;
          }
          // A deleted account is no account: anonymous, the sheet opens below.
          await deps.endSession();
        }
      }
      if (deps.isSignedIn()) {
        if (hasFirstName) {
          action();
          return;
        }
        // An e-mail account left before its name: the step comes back (Ecrans › E-10).
        pendingAction = action;
        set({
          isOpen: true,
          intent,
          step: 'welcome',
          welcome: { firstName: '', isRequired: true, isPrefilled: false },
        });
        return;
      }
      pendingAction = action;
      store.setState({ ...closed, isOpen: true, intent });
      deps.trackPrompted(intent);
    },

    chooseEmail: () => set({ step: 'email', error: null }),
    /** The arrow of the e-mail step and of « Vérifiez vos e-mails »: back one step. */
    back: () =>
      set(
        store.getState().step === 'sent'
          ? { step: 'email', error: null }
          : { step: 'choices', error: null, pendingLink: null },
      ),
    changeAddress: () => set({ step: 'email', error: null }),

    async signInWithGoogle() {
      set({ isBusy: true, error: null });
      try {
        const result = await deps.provider.signInWithGoogle();
        if (!result) {
          set({ isBusy: false });
          return;
        }
        await signedIn(result);
      } catch (error) {
        set({ isBusy: false, error: failureOf(error) });
      }
    },

    /** « Recevoir le lien », or the confirmation of the address of a link already opened. */
    submitEmail(email: string) {
      const address = email.trim();
      const link = store.getState().pendingLink;
      return link ? signInWithLink(address, link) : send(address, false);
    },
    resend: () => send(store.getState().email, true),

    /**
     * A sign-in link opened in the app: signs in with the address this phone sent it to, or asks
     * for it when it was sent from another device. False when `url` is no such link.
     */
    openLink(url: string): boolean {
      if (!deps.provider.isEmailLink(url)) {
        return false;
      }
      const pending = deps.pendingEmail.get();
      if (pending) {
        void signInWithLink(pending.email, url);
      } else {
        set({ isOpen: true, step: 'email', pendingLink: url, error: null });
      }
      return true;
    },

    async saveFirstName(firstName: string) {
      set({ isBusy: true, error: null });
      try {
        await deps.saveFirstName(firstName.trim());
        hasFirstName = true;
        finish();
      } catch (error) {
        set({ isBusy: false, error: failureOf(error) });
      }
    },

    /**
     * The sheet closed by a swipe or the veil: the action is dropped. A name step that can be
     * skipped resumes the action, the name prefilled kept.
     */
    dismiss() {
      const { step, welcome } = store.getState();
      if (step === 'welcome' && welcome && !welcome.isRequired) {
        finish();
        return;
      }
      pendingAction = null;
      store.setState(closed);
    },

    /** Signed out: the name is asked again for the next account. */
    reset() {
      hasFirstName = null;
      pendingAction = null;
      store.setState(closed);
    },
  };
}

export type SignInFlow = ReturnType<typeof createSignInFlow>;
