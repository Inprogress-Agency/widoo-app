import { SignInError, type SignInFailure } from '@/lib/auth/auth-client';
import { toDataURL } from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { useSession } from './useSession';

const failureOf = (error: unknown): SignInFailure =>
  error instanceof SignInError ? error.failure : 'generic';

/**
 * The second factor of the admin (D-087): typing the code of the authenticator app to finish a
 * sign-in, and, for a first sign-in, preparing the QR code of the account then adding the factor.
 * `isEnrolling` says which of the two the screen is doing.
 */
export function useSecondFactor(isEnrolling: boolean) {
  const { verifySecondFactor, startTotpEnrollment, finishTotpEnrollment, signOut } = useSession();
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [setup, setSetup] = useState<{ qrCodeImage: string; secretKey: string } | null>(null);
  // One secret per visit of the screen: React runs effects twice in development.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isEnrolling || hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    startTotpEnrollment()
      .then(async ({ qrCodeUri, secretKey }) =>
        setSetup({ qrCodeImage: await toDataURL(qrCodeUri, { margin: 1, width: 352 }), secretKey }),
      )
      .catch((error: unknown) => setFailure(failureOf(error)));
  }, [isEnrolling, startTotpEnrollment]);

  const handleSubmit = async () => {
    setFailure(null);
    setIsBusy(true);
    try {
      await (isEnrolling ? finishTotpEnrollment(code) : verifySecondFactor(code));
    } catch (error) {
      setFailure(failureOf(error));
      setCode('');
    } finally {
      setIsBusy(false);
    }
  };

  return {
    code,
    failure,
    isBusy,
    setup,
    handleCodeChange: setCode,
    handleSubmit: () => void handleSubmit(),
    handleOtherAccount: () => void signOut(),
  };
}
