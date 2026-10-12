import { SignInContainer } from '@/containers/SignInContainer';
import { Suspense } from 'react';

/** A-01. The page asked for is read from the address, in the browser only. */
export default function SignInPage() {
  return (
    <Suspense>
      <SignInContainer />
    </Suspense>
  );
}
