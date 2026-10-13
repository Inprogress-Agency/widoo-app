'use client';

import { SecondFactorChallenge } from '@/components/sign-in/SecondFactorChallenge';
import { SignInLayout } from '@/components/sign-in/SignInLayout';
import { SignInNotices } from '@/components/sign-in/SignInNotices';
import { TotpEnrollment } from '@/components/sign-in/TotpEnrollment';
import { useSecondFactor } from '@/hooks/useSecondFactor';

/**
 * The second step of a sign-in to the admin: the code of the authenticator app, or its first
 * set-up for a member of the team who has none yet (D-087).
 */
export function SecondFactorContainer({ isEnrolling }: { isEnrolling: boolean }) {
  const factor = useSecondFactor(isEnrolling);
  const notices = <SignInNotices returnSection={null} refusal={null} failure={factor.failure} />;
  return (
    <SignInLayout>
      {isEnrolling ? (
        <TotpEnrollment
          notices={notices}
          setup={factor.setup}
          code={factor.code}
          onCodeChange={factor.handleCodeChange}
          onSubmit={factor.handleSubmit}
          onOtherAccount={factor.handleOtherAccount}
          isBusy={factor.isBusy}
        />
      ) : (
        <SecondFactorChallenge
          notices={notices}
          code={factor.code}
          onCodeChange={factor.handleCodeChange}
          onSubmit={factor.handleSubmit}
          onOtherAccount={factor.handleOtherAccount}
          isBusy={factor.isBusy}
        />
      )}
    </SignInLayout>
  );
}
