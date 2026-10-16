import { affiliationPaths } from '@/components/affiliation/AffiliationTabs';
import { redirect } from 'next/navigation';

/** A-09 opens on the programs. */
export default function AffiliationPage() {
  redirect(affiliationPaths.programs);
}
