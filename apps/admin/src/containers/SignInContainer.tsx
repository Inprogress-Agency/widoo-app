'use client';

import { LinkSentPanel } from '@/components/sign-in/LinkSentPanel';
import { SignInForm } from '@/components/sign-in/SignInForm';
import { SignInLayout } from '@/components/sign-in/SignInLayout';
import { SignInNotices } from '@/components/sign-in/SignInNotices';
import { PageMessage } from '@/components/states/PageMessage';
import { UnavailableMessage } from '@/components/states/UnavailableMessage';
import { SecondFactorContainer } from '@/containers/SecondFactorContainer';
import { useSession } from '@/hooks/useSession';
import { useSignIn } from '@/hooks/useSignIn';
import { returnParam, returnSection, safeReturnPath } from '@/lib/return-path';
import { messages } from '@/messages/fr';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/** A-01: the sign-in page, then the page asked for once a member of the team is in. */
export function SignInContainer() {
  const router = useRouter();
  const returnPath = safeReturnPath(useSearchParams().get(returnParam));
  const { retry, signOut, hasExpired } = useSession();
  const signIn = useSignIn(returnPath);
  const { session } = signIn;

  useEffect(() => {
    if (session.status === 'signedIn') {
      router.replace(returnPath);
    }
  }, [session.status, returnPath, router]);

  if (session.status === 'unavailable') {
    return <UnavailableMessage onRetry={retry} onOtherAccount={() => void signOut()} />;
  }
  if (session.status === 'secondFactorChallenge' || session.status === 'secondFactorEnrollment') {
    return <SecondFactorContainer isEnrolling={session.status === 'secondFactorEnrollment'} />;
  }
  if (session.status !== 'signedOut') {
    return <PageMessage role="status" title={messages.shell.loading} />;
  }

  const notices = (
    <SignInNotices
      returnSection={returnSection(returnPath)}
      refusal={session.refusal}
      failure={signIn.failure}
      hasExpired={hasExpired}
    />
  );
  return (
    <SignInLayout>
      {signIn.isLinkSent ? (
        <LinkSentPanel
          notices={notices}
          email={signIn.email}
          secondsLeft={signIn.secondsLeft}
          onResend={signIn.handleResend}
          onOtherAddress={signIn.handleOtherAddress}
          isBusy={signIn.isBusy}
        />
      ) : (
        <SignInForm
          notices={notices}
          email={signIn.email}
          onEmailChange={signIn.handleEmailChange}
          onGoogle={signIn.handleGoogle}
          onSendLink={signIn.handleSendLink}
          isBusy={signIn.isBusy}
        />
      )}
    </SignInLayout>
  );
}
