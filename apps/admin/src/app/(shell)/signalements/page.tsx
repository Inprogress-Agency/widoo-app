import { reportsPaths } from '@/components/reports/ReportsTabs';
import { redirect } from 'next/navigation';

/** A-03 opens on the reports of routes, where what waits for the team is counted. */
export default function ReportsPage() {
  redirect(reportsPaths.routes);
}
