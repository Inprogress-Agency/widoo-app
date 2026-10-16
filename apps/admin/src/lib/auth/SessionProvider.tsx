'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { publicEnv } from '@/config/public-env';
import type { SignInOutcome, TotpEnrollment } from './auth-client';
import { getSessionClients, onSessionRefused } from './clients';
import { readSession, requireSecondFactor, type Session, type SignInRefusal } from './session';

export type SessionContextValue = {
  session: Session;
  /** The API ended the session of the member signed in (12 hours, D-087): A-01 says so. */
  hasExpired: boolean;
  /** Opens the Google window, and says how the attempt ended. Throws a `SignInError`. */
  signInWithGoogle: () => Promise<SignInOutcome>;
  sendSignInLink: (email: string, returnPath: string) => Promise<void>;
  /** Signs in when `url` is a sign-in link; `notALink` otherwise. Throws a `SignInError`. */
  completeSignInLink: (url: string) => Promise<SignInOutcome | 'notALink'>;
  /** Finishes a sign-in with the code of the authenticator app. Throws a `SignInError`. */
  verifySecondFactor: (code: string) => Promise<void>;
  /** Prepares the second factor of the member signed in. Throws a `SignInError`. */
  startTotpEnrollment: () => Promise<TotpEnrollment>;
  /** Adds the second factor, then lets the member in. Throws a `SignInError`. */
  finishTotpEnrollment: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reads the account again after the API did not answer. */
  retry: () => void;
};

// The local Auth emulator has no TOTP: the second factor is only required with a real project,
// as on the side of the API.
const isSecondFactorRequired = publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL === undefined;

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
  // A sign-in waits for its code: nobody is signed in yet, but the person is not signed out.
  const isChallengePending = useRef(false);
  const [hasExpired, setHasExpired] = useState(false);
  const status = useRef(session.status);

  useEffect(() => {
    status.current = session.status;
  });

  // The API refuses the token of a member who was in: the session is over, back to A-01.
  useEffect(() => {
    onSessionRefused(() => {
      if (status.current !== 'signedIn') {
        return;
      }
      setHasExpired(true);
      void getSessionClients().auth.signOut();
    });
    return () => onSessionRefused(undefined);
  }, []);

  useEffect(() => {
    const { auth, api } = getSessionClients();
    let isCurrent = true;
    const unsubscribe = auth.onUserChanged((uid) => {
      if (uid === null) {
        setSession(
          isChallengePending.current
            ? { status: 'secondFactorChallenge' }
            : { status: 'signedOut', refusal: refusal.current },
        );
        return;
      }
      isChallengePending.current = false;
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
        setSession(
          requireSecondFactor(next, {
            isRequired: isSecondFactorRequired,
            isEnrolled: auth.hasSecondFactor(),
          }),
        );
      });
    });
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [attempt]);

  const startAttempt = useCallback(() => {
    refusal.current = null;
    setHasExpired(false);
    setSession((current) =>
      current.status === 'signedOut' ? { status: 'signedOut', refusal: null } : current,
    );
  }, []);

  /** Shows the code screen when a sign-in asks for the second factor. */
  const followUp = useCallback(<Outcome extends string>(outcome: Outcome): Outcome => {
    if (outcome === 'secondFactorRequired') {
      isChallengePending.current = true;
      setSession({ status: 'secondFactorChallenge' });
    }
    return outcome;
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const auth = () => getSessionClients().auth;
    return {
      session,
      hasExpired,
      signInWithGoogle: async () => {
        startAttempt();
        return followUp(await auth().signInWithGoogle());
      },
      sendSignInLink: (email, returnPath) => {
        startAttempt();
        return auth().sendSignInLink(email, returnPath);
      },
      completeSignInLink: async (url) => followUp(await auth().completeSignInLink(url)),
      verifySecondFactor: (code) => auth().verifySecondFactor(code),
      startTotpEnrollment: () => auth().startTotpEnrollment(),
      finishTotpEnrollment: async (code) => {
        await auth().finishTotpEnrollment(code);
        // Read the session again: the account now has its second factor.
        setAttempt((count) => count + 1);
      },
      signOut: () => {
        isChallengePending.current = false;
        setHasExpired(false);
        setSession((current) =>
          current.status === 'secondFactorChallenge'
            ? { status: 'signedOut', refusal: null }
            : current,
        );
        return auth().signOut();
      },
      retry: () => setAttempt((count) => count + 1),
    };
  }, [session, hasExpired, startAttempt, followUp]);

  return <SessionContext value={value}>{children}</SessionContext>;
}
