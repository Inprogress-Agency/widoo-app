import type { Icon } from '@phosphor-icons/react';
import { cn, Tooltip } from '@widoo/ui';
import Link from 'next/link';

type SidebarLinkProps = {
  href: string;
  label: string;
  icon: Icon;
  /** The section being shown: white ground, filled blue icon, `aria-current`. */
  isActive: boolean;
  /** Reduced menu: the icon alone, the label in a tooltip on hover and on focus. */
  isIconOnly: boolean;
};

/** An entry of the navigation: a link of 36 px with the icon of its section. */
export function SidebarLink({ href, label, icon: IconOf, isActive, isIconOnly }: SidebarLinkProps) {
  const link = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={isIconOnly ? label : undefined}
      className={cn(
        'flex min-h-chip-h items-center gap-10 rounded-thumb text-control text-sidebar-foreground',
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
    </Link>
  );
  return isIconOnly ? <Tooltip content={label}>{link}</Tooltip> : link;
}
