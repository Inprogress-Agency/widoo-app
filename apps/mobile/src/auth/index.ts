import * as Sentry from '@sentry/react-native';
import { useStore } from 'zustand';
import { analytics } from '../analytics';
import { queryClient } from '../api/query-client';
import { createFirebaseAuth } from './firebase';
import { resetRightsDependentQueries, signOutOnDeletedAccount } from './rights';
import { createSession, type SessionState } from './session';

// `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle. The
// OAuth client of type « web » of the Firebase project: public, not a secret.
export const authProvider = createFirebaseAuth(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

/** The session of the app (E-10): signed in or anonymous, and the only way to the token. */
export const session = createSession(authProvider, {
  onSignedInChange: () => {
    void resetRightsDependentQueries(queryClient);
  },
  onSignOutFailed: (error) => Sentry.captureException(error),
});

session.store.subscribe((state) => analytics.setAuthenticated(state.status === 'signedIn'));
signOutOnDeletedAccount(queryClient, session.endSession);

export function useSession<T>(selector: (state: SessionState) => T): T {
  return useStore(session.store, selector);
}
