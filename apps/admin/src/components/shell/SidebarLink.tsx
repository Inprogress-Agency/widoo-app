import type { Icon } from '@phosphor-icons/react';
import { cn, CountBadge, Tooltip } from '@widoo/ui';
import Link from 'next/link';

type SidebarLinkProps = {
  href: string;
  label: string;
  icon: Icon;
  /** The section being shown: white ground, filled blue icon, `aria-current`. */
  isActive: boolean;
  /** Reduced menu: the icon alone, the label in a tooltip on hover and on focus. */
  isIconOnly: boolean;
  /** What waits in the section, when something does. */
  counter?: SidebarCounter;
};

export type SidebarCounter = {
  count: number;
  /** Something has been waiting for more than 72 hours: the pill turns red. */
  isLate: boolean;
  /** The counter said in full: « 12 parcours à relire, dont 2 en retard ». */
  label: string;
};

/** An entry of the navigation: a link of 36 px with the icon of its section. */
export function SidebarLink({
  href,
  label,
  icon: IconOf,
  isActive,
  isIconOnly,
  counter,
}: SidebarLinkProps) {
  const badge = counter ? (
    <CountBadge
      count={counter.count}
      isLate={counter.isLate}
      label={counter.label}
      className={isIconOnly ? 'absolute -top-4 right-4' : 'ml-auto'}
    />
  ) : null;
  const link = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={isIconOnly ? label : undefined}
      className={cn(
        'relative flex min-h-chip-h items-center gap-10 rounded-thumb text-control text-sidebar-foreground',
        isIconOnly ? 'justify-center' : 'px-10',
        isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent',
      )}
    >
      <IconOf
        aria-hidden
        weight={isActive ? 'fill' : 'regular'}
        className={cn('size-18 shrink-0', isActive && 'text-sidebar-primary')}
      />
      {isIconOnly ? null : label}
      {badge}
    </Link>
  );
  if (!isIconOnly) {
    return link;
  }
  return <Tooltip content={counter ? `${label} : ${counter.label}` : label}>{link}</Tooltip>;
}
