import { ReportsTabs } from '@/components/reports/ReportsTabs';
import { ReportPlacesContainer } from '@/containers/ReportPlacesContainer';
import { Suspense } from 'react';

/** A-03, the places the community flagged. */
export default function ReportPlacesPage() {
  return (
    <div className="flex flex-col gap-16">
      <ReportsTabs current="places" />
      <Suspense>
        <ReportPlacesContainer />
      </Suspense>
    </div>
  );
}
