import { AffiliationTabs } from '@/components/affiliation/AffiliationTabs';
import { ProgramsContainer } from '@/containers/ProgramsContainer';
import { Suspense } from 'react';

/** A-09, the affiliate programs. The open program is read from the address, in the browser. */
export default function ProgramsPage() {
  return (
    <div className="flex flex-col gap-16">
      <AffiliationTabs current="programs" />
      <Suspense>
        <ProgramsContainer />
      </Suspense>
    </div>
  );
}
