import { cn } from '@widoo/ui';
import Link from 'next/link';

type SectionTabsProps<TabId extends string> = {
  /** Name of the navigation for screen readers. */
  label: string;
  tabs: readonly { id: TabId; label: string; href: string }[];
  current: TabId;
};

/** The lists of a section as tabs above them, each one its own address. */
export function SectionTabs<TabId extends string>({
  label,
  tabs,
  current,
}: SectionTabsProps<TabId>) {
  return (
    <nav aria-label={label} className="flex gap-4 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === current ? 'page' : undefined}
          className={cn(
            'border-b-2 px-12 py-10 text-control',
            tab.id === current
              ? 'border-primary text-foreground'
              : 'border-background text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
