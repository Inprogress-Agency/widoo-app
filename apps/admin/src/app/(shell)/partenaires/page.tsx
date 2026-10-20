import { PartnersContainer } from '@/containers/PartnersContainer';
import { Suspense } from 'react';

/** A-10, the B2B partners. The open partner is read from the address, in the browser. */
export default function PartnersPage() {
  return (
    <Suspense>
      <PartnersContainer />
    </Suspense>
  );
}
