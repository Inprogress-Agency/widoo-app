import { AffiliationTabs } from '@/components/affiliation/AffiliationTabs';
import { BookableStepsContainer } from '@/containers/BookableStepsContainer';
import { Suspense } from 'react';

/** A-09, the steps that can be booked. The filter and the page are read from the address. */
export default function BookableStepsPage() {
  return (
    <div className="flex flex-col gap-16">
      <AffiliationTabs current="steps" />
      <Suspense>
        <BookableStepsContainer />
      </Suspense>
    </div>
  );
}
