import { SectionTabs } from '@/components/navigation/SectionTabs';
import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';

const texts = messages.catalog.tabs;

/** Addresses of the two lists of the catalog. */
export const catalogPaths = {
  places: `${sectionPaths.catalog}/lieux`,
  routes: `${sectionPaths.catalog}/parcours`,
} as const;

/** The two lists of the catalog (A-04), as tabs above them: places, then routes. */
export function CatalogTabs({ current }: { current: keyof typeof catalogPaths }) {
  return (
    <SectionTabs
      label={texts.label}
      current={current}
      tabs={[
        { id: 'places', label: texts.places, href: catalogPaths.places },
        { id: 'routes', label: texts.routes, href: catalogPaths.routes },
      ]}
    />
  );
}
