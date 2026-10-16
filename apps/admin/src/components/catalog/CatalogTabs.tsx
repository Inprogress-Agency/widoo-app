import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';
import { cn } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.catalog.tabs;

/** Addresses of the two lists of the catalog. */
export const catalogPaths = {
  places: `${sectionPaths.catalog}/lieux`,
  routes: `${sectionPaths.catalog}/parcours`,
} as const;

/** The two lists of the catalog (A-04), as tabs above them: places, then routes. */
export function CatalogTabs({ current }: { current: keyof typeof catalogPaths }) {
  return (
    <nav aria-label={texts.label} className="flex gap-4 border-b border-border">
      {(['places', 'routes'] as const).map((tab) => (
        <Link
          key={tab}
          href={catalogPaths[tab]}
          aria-current={tab === current ? 'page' : undefined}
          className={cn(
            'border-b-2 px-12 py-10 text-control',
            tab === current
              ? 'border-primary text-foreground'
              : 'border-background text-muted-foreground hover:text-foreground',
          )}
        >
          {texts[tab]}
        </Link>
      ))}
    </nav>
  );
}
