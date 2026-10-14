import type { AuthProvider, AuthUser, SignInResult } from '../auth/provider';

/**
 * Firebase in the tests: no native module, no network. Anonymous at first; a test signs in
 * with `fakeAuth.setUser`, and stubs the sign-in methods it drives.
 */
export function createFakeAuth() {
  let user: AuthUser | null = null;
  const listeners = new Set<(user: AuthUser | null) => void>();
  const setUser = (next: AuthUser | null) => {
    user = next;
    listeners.forEach((listener) => listener(next));
  };
  const signedIn = (result: SignInResult) => {
    setUser(result.user);
    return result;
  };
  const provider: AuthProvider = {
    onUserChanged: (listener) => {
      listeners.add(listener);
      listener(user);
      return () => listeners.delete(listener);
    },
    getIdToken: async () => (user ? 'fake-token' : null),
    signInWithGoogle: async () => null,
    sendEmailLink: async () => undefined,
    isEmailLink: (url) => url.includes('/__/auth/links'),
    signInWithEmailLink: async (email) =>
      signedIn({
        user: { uid: 'fake-uid', email, displayName: null },
        method: 'email',
        isNewUser: true,
      }),
    signOut: async () => setUser(null),
  };
  return { provider, setUser, signedIn };
}

export const fakeAuth = createFakeAuth();
