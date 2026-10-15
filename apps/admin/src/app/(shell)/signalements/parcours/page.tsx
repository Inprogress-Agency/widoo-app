import { ReportsTabs } from '@/components/reports/ReportsTabs';
import { ReportRoutesContainer } from '@/containers/ReportRoutesContainer';
import { Suspense } from 'react';

/** A-03, the open reports of routes. The state of the list is read from the address. */
export default function ReportRoutesPage() {
  return (
    <div className="flex flex-col gap-16">
      <ReportsTabs current="routes" />
      <Suspense>
        <ReportRoutesContainer />
      </Suspense>
    </div>
  );
}
