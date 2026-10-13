import { returnParam } from '@/lib/return-path';
import { FirebaseError, initializeApp } from '@firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getMultiFactorResolver,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  multiFactor,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
  type TotpSecret,
} from '@firebase/auth';
import {
  SignInError,
  type AuthClient,
  type SignInFailure,
  type SignInOutcome,
} from './auth-client';

export type FirebaseSettings = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  /** Local Auth emulator (`http://127.0.0.1:9099`); never set on staging or production. */
  emulatorUrl?: string;
};

// The address the link was asked for, kept on this device only: Firebase asks for it again when
// the link comes back, so that a link opened by someone else signs nobody in.
const pendingEmailKey = 'widoo.admin.signInEmail';

const closedByUser = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const failures: Record<string, SignInFailure> = {
  'auth/popup-blocked': 'popupBlocked',
  'auth/invalid-action-code': 'linkInvalid',
  'auth/expired-action-code': 'linkInvalid',
  'auth/invalid-email': 'linkInvalid',
  'auth/invalid-verification-code': 'codeInvalid',
  'auth/code-expired': 'codeInvalid',
  'auth/requires-recent-login': 'recentSignInRequired',
};

const secondFactorRequired = 'auth/multi-factor-auth-required';
// Name of the account in the authenticator app, and of the second factor in Firebase.
const issuer = 'Widoo Admin';
const factorName = 'Application';

function signInError(error: unknown): SignInError {
  const failure = error instanceof FirebaseError ? failures[error.code] : undefined;
  return new SignInError(failure ?? 'generic', { cause: error });
}

/** The identity provider of the admin: Firebase Authentication, Google and e-mail link. */
export function createFirebaseAuthClient(settings: FirebaseSettings): AuthClient {
  const { emulatorUrl, ...options } = settings;
  const auth = getAuth(initializeApp(options));
  auth.languageCode = 'fr';
  if (emulatorUrl) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }

  // The sign-in waiting for its code, and the secret of an enrollment being set up: both only
  // live between two steps of the same screen.
  let pendingSignIn: MultiFactorResolver | null = null;
  let pendingSecret: TotpSecret | null = null;

  /** Runs a sign-in, and keeps what Firebase needs when it asks for the second factor. */
  async function attempt(signIn: () => Promise<unknown>): Promise<SignInOutcome> {
    try {
      await signIn();
      return 'signedIn';
    } catch (error) {
      if (error instanceof FirebaseError && closedByUser.has(error.code)) {
        return 'cancelled';
      }
      if (error instanceof FirebaseError && error.code === secondFactorRequired) {
        pendingSignIn = getMultiFactorResolver(auth, error as MultiFactorError);
        return 'secondFactorRequired';
      }
      throw signInError(error);
    }
  }

  function signedInUser() {
    if (!auth.currentUser) {
      throw new SignInError('recentSignInRequired');
    }
    return auth.currentUser;
  }

  return {
    onUserChanged: (listener) => onAuthStateChanged(auth, (user) => listener(user?.uid ?? null)),

    getToken: async ({ forceRefresh }) =>
      (await auth.currentUser?.getIdToken(forceRefresh)) ?? null,

    signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      // Always the account chooser: a refused account must be able to try another one.
      provider.setCustomParameters({ prompt: 'select_account' });
      return attempt(() => signInWithPopup(auth, provider));
    },

    async sendSignInLink(email, returnPath) {
      const url = new URL('/connexion', window.location.origin);
      url.searchParams.set(returnParam, returnPath);
      try {
        await sendSignInLinkToEmail(auth, email, { url: url.href, handleCodeInApp: true });
      } catch (error) {
        throw signInError(error);
      }
      window.localStorage.setItem(pendingEmailKey, email);
    },

    async completeSignInLink(url) {
      if (!isSignInWithEmailLink(auth, url)) {
        return 'notALink';
      }
      const email = window.localStorage.getItem(pendingEmailKey);
      if (!email) {
        throw new SignInError('linkOtherDevice');
      }
      const outcome = await attempt(() => signInWithEmailLink(auth, email, url));
      window.localStorage.removeItem(pendingEmailKey);
      return outcome;
    },

    async verifySecondFactor(code) {
      const hint = pendingSignIn?.hints.find(
        (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (!pendingSignIn || !hint) {
        throw new SignInError('recentSignInRequired');
      }
      try {
        await pendingSignIn.resolveSignIn(
          TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code),
        );
      } catch (error) {
        throw signInError(error);
      }
      pendingSignIn = null;
    },

    hasSecondFactor: () =>
      auth.currentUser !== null && multiFactor(auth.currentUser).enrolledFactors.length > 0,

    async startTotpEnrollment() {
      const user = signedInUser();
      try {
        const session = await multiFactor(user).getSession();
        pendingSecret = await TotpMultiFactorGenerator.generateSecret(session);
      } catch (error) {
        throw signInError(error);
      }
      return {
        secretKey: pendingSecret.secretKey,
        qrCodeUri: pendingSecret.generateQrCodeUrl(user.email ?? issuer, issuer),
      };
    },

    async finishTotpEnrollment(code) {
      const user = signedInUser();
      if (!pendingSecret) {
        throw new SignInError('recentSignInRequired');
      }
      try {
        await multiFactor(user).enroll(
          TotpMultiFactorGenerator.assertionForEnrollment(pendingSecret, code),
          factorName,
        );
        // The API reads the second factor in the token: ask for one that carries it.
        await user.getIdToken(true);
      } catch (error) {
        throw signInError(error);
      }
      pendingSecret = null;
    },

    signOut: () => signOut(auth),
  };
}
