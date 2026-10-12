'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getSessionClients } from './clients';
import { readSession, type Session, type SignInRefusal } from './session';

export type SessionContextValue = {
  session: Session;
  /** Opens the Google window; false when the person closed it. Throws a `SignInError`. */
  signInWithGoogle: () => Promise<boolean>;
  sendSignInLink: (email: string, returnPath: string) => Promise<void>;
  /** Signs in when `url` is a sign-in link; false when it is not one. Throws a `SignInError`. */
  completeSignInLink: (url: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Reads the account again after the API did not answer. */
  retry: () => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the session of the admin: who is signed in with the identity provider, and what the API
 * says of this account. An account without a team role is signed out at once, with the reason
 * kept for the sign-in page.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Why the last account was refused: read when the provider reports the sign-out that follows.
  const refusal = useRef<SignInRefusal | null>(null);

  useEffect(() => {
    const { auth, api } = getSessionClients();
    let isCurrent = true;
    const unsubscribe = auth.onUserChanged((uid) => {
      if (uid === null) {
        setSession({ status: 'signedOut', refusal: refusal.current });
        return;
      }
      setSession({ status: 'loading' });
      void readSession(api).then(async (next) => {
        if (!isCurrent) {
          return;
        }
        if (next.status === 'signedOut') {
          refusal.current = next.refusal;
          await auth.signOut();
          return;
        }
        setSession(next);
      });
    });
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [attempt]);

  const startAttempt = useCallback(() => {
    refusal.current = null;
    setSession((current) =>
      current.status === 'signedOut' ? { status: 'signedOut', refusal: null } : current,
    );
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signInWithGoogle: () => {
        startAttempt();
        return getSessionClients().auth.signInWithGoogle();
      },
      sendSignInLink: (email, returnPath) => {
        startAttempt();
        return getSessionClients().auth.sendSignInLink(email, returnPath);
      },
      completeSignInLink: (url) => getSessionClients().auth.completeSignInLink(url),
      signOut: () => getSessionClients().auth.signOut(),
      retry: () => setAttempt((count) => count + 1),
    }),
    [session, startAttempt],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
