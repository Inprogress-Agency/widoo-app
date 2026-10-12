import { SignInError, type SignInFailure } from '@/lib/auth/auth-client';
import { signInPathFor } from '@/lib/return-path';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCountdown } from './useCountdown';
import { useSession } from './useSession';

// Wiki Ecrans › A-01, « lien envoyé »: the link may be sent again after 60 s.
const resendDelaySeconds = 60;

const failureOf = (error: unknown): SignInFailure =>
  error instanceof SignInError ? error.failure : 'generic';

/**
 * The sign-in page (A-01): the two ways in, the link that comes back from the mailbox, and what
 * to tell the person when one of them fails. `returnPath` is the page to open afterwards.
 */
export function useSignIn(returnPath: string) {
  const { session, signInWithGoogle, sendSignInLink, completeSignInLink } = useSession();
  const [email, setEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const { secondsLeft, start: startResendDelay } = useCountdown(resendDelaySeconds);

  const router = useRouter();
  // A link only serves once: React runs effects twice in development.
  const hasReadLink = useRef(false);

  // The page opened from the link of the e-mail: finish signing in, then drop the code of the
  // link from the address, so that reloading the page does not present it again.
  useEffect(() => {
    if (hasReadLink.current) {
      return;
    }
    hasReadLink.current = true;
    completeSignInLink(window.location.href)
      .then((wasLink) => wasLink && router.replace(signInPathFor(returnPath)))
      .catch((error: unknown) => {
        setFailure(failureOf(error));
        router.replace(signInPathFor(returnPath));
      });
  }, [completeSignInLink, returnPath, router]);

  const run = async (attempt: () => Promise<unknown>) => {
    setFailure(null);
    setIsBusy(true);
    try {
      await attempt();
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setIsBusy(false);
    }
  };

  const sendLink = () =>
    run(async () => {
      await sendSignInLink(email.trim(), returnPath);
      setIsLinkSent(true);
      startResendDelay();
    });

  return {
    session,
    email,
    isLinkSent,
    failure,
    isBusy,
    secondsLeft,
    handleEmailChange: setEmail,
    handleGoogle: () => run(signInWithGoogle),
    handleSendLink: sendLink,
    handleResend: sendLink,
    handleOtherAddress: () => {
      setFailure(null);
      setIsLinkSent(false);
    },
  };
}
