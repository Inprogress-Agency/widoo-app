import { messages } from '@/messages/fr';
import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@widoo/ui';
import type { AdminSection } from '@widoo/shared';
import Link from 'next/link';
import { sectionIcons } from './section-icons';
import { SidebarLink, type SidebarCounter } from './SidebarLink';
import { WidooLogo } from './WidooLogo';

export type SidebarEntry = {
  section: AdminSection;
  href: string;
  label: string;
  counter?: SidebarCounter;
};
export type SidebarGroup = { id: string; label: string; entries: SidebarEntry[] };

type AdminSidebarProps = {
  /** The dashboard, alone above the groups. */
  home: SidebarEntry;
  /** The groups of the role, each with the sections it opens. */
  groups: SidebarGroup[];
  activeSection: AdminSection | null;
  /** Reduced to its icons: 72 px instead of 248 px. */
  isIconOnly: boolean;
  /** Absent when the window is too narrow for the full menu: nothing to toggle. */
  onToggle?: () => void;
};

/** Navigation of the admin, on warm gray: logo, dashboard, then the sections of the role. */
export function AdminSidebar({
  home,
  groups,
  activeSection,
  isIconOnly,
  onToggle,
}: AdminSidebarProps) {
  const renderEntry = (entry: SidebarEntry) => (
    <li key={entry.section}>
      <SidebarLink
        href={entry.href}
        label={entry.label}
        icon={sectionIcons[entry.section]}
        isActive={entry.section === activeSection}
        isIconOnly={isIconOnly}
        counter={entry.counter}
      />
    </li>
  );

  return (
    <nav
      aria-label={messages.shell.navigation}
      className={cn(
        'relative flex h-full shrink-0 flex-col gap-16 overflow-y-auto bg-sidebar p-10',
        isIconOnly ? 'w-sidebar-icons' : 'w-sidebar',
      )}
    >
      <Link
        href={home.href}
        className={cn('flex rounded-thumb p-6', isIconOnly && 'justify-center')}
      >
        <WidooLogo isIconOnly={isIconOnly} />
      </Link>
      <ul>{renderEntry(home)}</ul>
      {groups.map((group) => (
        <section
          key={group.id}
          aria-label={group.label}
          className={cn(
            'flex flex-col gap-4',
            isIconOnly && 'border-t border-sidebar-border pt-16',
          )}
        >
          {isIconOnly ? null : (
            <h2 className="px-10 text-label text-muted-foreground">{group.label}</h2>
          )}
          <ul className="flex flex-col gap-4">{group.entries.map(renderEntry)}</ul>
        </section>
      ))}
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={isIconOnly ? messages.shell.expand : undefined}
          className={cn(
            'mt-auto flex min-h-chip-h items-center gap-10 rounded-thumb text-body-s text-muted-foreground hover:bg-sidebar-accent',
            isIconOnly ? 'justify-center' : 'px-10',
          )}
        >
          <SidebarSimpleIcon aria-hidden className="size-18 shrink-0" />
          {isIconOnly ? null : messages.shell.collapse}
        </button>
      ) : null}
    </nav>
  );
}
