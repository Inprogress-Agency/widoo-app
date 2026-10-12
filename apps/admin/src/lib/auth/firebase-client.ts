import { returnParam } from '@/lib/return-path';
import { FirebaseError, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { SignInError, type AuthClient, type SignInFailure } from './auth-client';

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
};

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

  return {
    onUserChanged: (listener) => onAuthStateChanged(auth, (user) => listener(user?.uid ?? null)),

    getToken: async ({ forceRefresh }) =>
      (await auth.currentUser?.getIdToken(forceRefresh)) ?? null,

    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      // Always the account chooser: a refused account must be able to try another one.
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await signInWithPopup(auth, provider);
        return true;
      } catch (error) {
        if (error instanceof FirebaseError && closedByUser.has(error.code)) {
          return false;
        }
        throw signInError(error);
      }
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
        return false;
      }
      const email = window.localStorage.getItem(pendingEmailKey);
      if (!email) {
        throw new SignInError('linkOtherDevice');
      }
      try {
        await signInWithEmailLink(auth, email, url);
      } catch (error) {
        throw signInError(error);
      }
      window.localStorage.removeItem(pendingEmailKey);
      return true;
    },

    signOut: () => signOut(auth),
  };
}
