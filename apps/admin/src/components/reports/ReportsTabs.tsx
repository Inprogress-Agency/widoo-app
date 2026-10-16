import { SectionTabs } from '@/components/navigation/SectionTabs';
import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';

const texts = messages.reports.tabs;

/** Addresses of the three lists of the reports (A-03). */
export const reportsPaths = {
  places: `${sectionPaths.reports}/lieux`,
  routes: `${sectionPaths.reports}/parcours`,
  ratings: `${sectionPaths.reports}/avis`,
} as const;

/** The three lists of A-03 as tabs: places, routes, ratings. */
export function ReportsTabs({ current }: { current: keyof typeof reportsPaths }) {
  return (
    <SectionTabs
      label={texts.label}
      current={current}
      tabs={[
        { id: 'places', label: texts.places, href: reportsPaths.places },
        { id: 'routes', label: texts.routes, href: reportsPaths.routes },
        { id: 'ratings', label: texts.ratings, href: reportsPaths.ratings },
      ]}
    />
  );
}
