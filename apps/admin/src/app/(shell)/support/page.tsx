import { SupportContainer } from '@/containers/SupportContainer';
import { Suspense } from 'react';

/** A-13, the messages of « Nous écrire ». The open message is read from the address, in the browser. */
export default function SupportPage() {
  return (
    <Suspense>
      <SupportContainer />
    </Suspense>
  );
}
