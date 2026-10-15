import { ApiRequestError, type GetToken } from '@widoo/api-client';
import { createStore } from 'zustand/vanilla';
import type { AuthProvider, AuthUser } from './provider';

export interface SessionState {
  /** `loading` until Firebase has read the session kept on the device, at launch. */
  status: 'loading' | 'anonymous' | 'signedIn';
  user: AuthUser | null;
}

interface SessionOptions {
  /**
   * The user signed in or out (not the session read at launch): what the API answered depends on
   * the caller's rights, so the answers kept for the previous caller go (D-075).
   */
  onSignedInChange: (isSignedIn: boolean) => void;
  /** Firebase could not sign out after `endSession`: the app is anonymous all the same. */
  onSignOutFailed?: (error: unknown) => void;
}

/**
 * The session of the app: signed in or anonymous, and the only way to the Firebase token, which
 * the API client asks for before each authenticated request. The token never leaves this module
 * but in the `Authorization` header: never in a log, a report or an event.
 */
export function createSession(provider: AuthProvider, options: SessionOptions) {
  const store = createStore<SessionState>(() => ({ status: 'loading', user: null }));

  function setUser(user: AuthUser | null) {
    const wasSignedIn = store.getState().status === 'signedIn';
    const wasLoading = store.getState().status === 'loading';
    store.setState({ status: user ? 'signedIn' : 'anonymous', user });
    if (!wasLoading && wasSignedIn !== (user !== null)) {
      options.onSignedInChange(user !== null);
    }
  }

  provider.onUserChanged(setUser);

  /**
   * For the API client: null when signed out. A token Firebase cannot give (offline, its refresh
   * unreachable) fails the request as a network failure, retried and shown as such.
   */
  const getToken: GetToken = async ({ forceRefresh }) => {
    if (store.getState().status !== 'signedIn') {
      return null;
    }
    try {
      return await provider.getIdToken(forceRefresh);
    } catch (error) {
      throw new ApiRequestError('network', null, null, { cause: error });
    }
  };

  return {
    store,
    getToken,
    isSignedIn: () => store.getState().status === 'signedIn',
    signOut: () => provider.signOut(),
    /**
     * The account is gone (deleted from this phone, or a 401 « Account deleted »): the app is
     * anonymous at once, its token no longer sent, whatever Firebase does; Firebase signs out
     * next. Once per account: called again while anonymous, it does nothing.
     */
    endSession: async () => {
      if (store.getState().status !== 'signedIn') {
        return;
      }
      setUser(null);
      try {
        await provider.signOut();
      } catch (error) {
        options.onSignOutFailed?.(error);
      }
    },
    /**
     * A sign-in that went through: the session takes its user at once, without waiting for
     * Firebase to tell it, which it may not do for the account it still holds.
     */
    signedIn: (user: AuthUser) => setUser(user),
  };
}

export type Session = ReturnType<typeof createSession>;
