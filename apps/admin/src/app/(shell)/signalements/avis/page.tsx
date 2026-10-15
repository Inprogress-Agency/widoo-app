import { ReportsTabs } from '@/components/reports/ReportsTabs';
import { ReportRatingsContainer } from '@/containers/ReportRatingsContainer';
import { Suspense } from 'react';

/** A-03, the ratings with a comment. */
export default function ReportRatingsPage() {
  return (
    <div className="flex flex-col gap-16">
      <ReportsTabs current="ratings" />
      <Suspense>
        <ReportRatingsContainer />
      </Suspense>
    </div>
  );
}
