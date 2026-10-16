import { SectionTabs } from '@/components/navigation/SectionTabs';
import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';

const texts = messages.affiliation.tabs;

/** Addresses of the two lists of the affiliation (A-09). */
export const affiliationPaths = {
  programs: `${sectionPaths.affiliation}/programmes`,
  steps: `${sectionPaths.affiliation}/etapes`,
} as const;

/** The two lists of A-09 as tabs: the programs, then the bookable steps. */
export function AffiliationTabs({ current }: { current: keyof typeof affiliationPaths }) {
  return (
    <SectionTabs
      label={texts.label}
      current={current}
      tabs={[
        { id: 'programs', label: texts.programs, href: affiliationPaths.programs },
        { id: 'steps', label: texts.steps, href: affiliationPaths.steps },
      ]}
    />
  );
}
