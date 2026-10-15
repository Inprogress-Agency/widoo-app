import { getApp } from '@react-native-firebase/app';
import {
  getAdditionalUserInfo,
  getAuth,
  getIdToken,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailLink,
  signOut,
  type User,
  type UserCredential,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  accountProviderOf,
  SignInError,
  type AuthProvider,
  type AuthUser,
  type SignInFailure,
  type SignInMethod,
} from './provider';

/** Bundle id and package of the app (app.json), where the e-mail link must open. */
const APP_ID = 'app.widoo';

const failures: Record<string, SignInFailure> = {
  'auth/network-request-failed': 'offline',
  'auth/invalid-action-code': 'expired',
  'auth/expired-action-code': 'expired',
};

const codeOf = (error: unknown): string | null =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;

/** A failure of Firebase as the sheet tells it; its code only, never its message or token. */
function signInError(error: unknown): SignInError {
  const code = codeOf(error);
  return new SignInError((code && failures[code]) || 'failed', code, { cause: error });
}

const userOf = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  provider: accountProviderOf(user.providerData.map((info) => info.providerId)),
});

const resultOf = (credential: UserCredential, method: SignInMethod) => ({
  user: userOf(credential.user),
  method,
  isNewUser: getAdditionalUserInfo(credential)?.isNewUser ?? false,
});

/**
 * Firebase Authentication through its native SDKs (React Native Firebase): the session stays in
 * the keychain of the device, and the token is refreshed by the SDK. The keys of the Firebase
 * files are restricted to the app, which the native SDKs identify on each request.
 */
export function createFirebaseAuth(googleWebClientId: string | undefined): AuthProvider {
  const auth = getAuth();
  // The web client id makes Google give an ID token on Android; iOS reads its own client id
  // from GoogleService-Info.plist.
  GoogleSignin.configure({ webClientId: googleWebClientId });
  // The domain Firebase sends the links from, its hosting domain (README › Connexion).
  const linkDomain = `${getApp().options.projectId}.firebaseapp.com`;

  return {
    onUserChanged: (listener) =>
      onAuthStateChanged(auth, (user) => listener(user ? userOf(user) : null)),

    getIdToken: async (forceRefresh) =>
      auth.currentUser ? getIdToken(auth.currentUser, forceRefresh) : null,

    signInWithGoogle: async () => {
      let idToken: string | null;
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (response.type === 'cancelled') {
          return null;
        }
        idToken = response.data.idToken;
      } catch (error) {
        // Closing the window, or a second tap while it opens, shows nothing (Ecrans › E-10).
        if (
          isErrorWithCode(error) &&
          (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)
        ) {
          return null;
        }
        throw signInError(error);
      }
      if (!idToken) {
        throw new SignInError('failed', 'google/no-id-token');
      }
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        return resultOf(await signInWithCredential(auth, credential), 'google');
      } catch (error) {
        throw signInError(error);
      }
    },

    sendEmailLink: async (email) => {
      try {
        await sendSignInLinkToEmail(auth, email, {
          url: `https://${linkDomain}`,
          handleCodeInApp: true,
          linkDomain,
          iOS: { bundleId: APP_ID },
          // An internal build is not on the Play Store: no store page instead of the app.
          android: { packageName: APP_ID, installApp: false },
        });
      } catch (error) {
        throw signInError(error);
      }
    },

    isEmailLink: (url) => isSignInWithEmailLink(auth, url),

    signInWithEmailLink: async (email, url) => {
      try {
        return resultOf(await signInWithEmailLink(auth, email, url), 'email');
      } catch (error) {
        throw signInError(error);
      }
    },

    signOut: async () => {
      // The Google account is forgotten too, so that the next sign-in offers the choice again.
      await Promise.allSettled([GoogleSignin.signOut()]);
      await signOut(auth);
    },
  };
}
