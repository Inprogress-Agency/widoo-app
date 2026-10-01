import type { Icon } from '@phosphor-icons/react';
import { CrownSimpleIcon, LockSimpleIcon } from '@phosphor-icons/react/ssr';
import clsx from 'clsx';

export type BadgeKind = 'premium' | 'private';

/**
 * Look of each badge (mappings.badges of @widoo/tokens): Premium in ink at 86 % with an amber
 * crown, as in the app; Privé in white with a lock, as measured on the mockups of E-21.
 */
const looks: Record<BadgeKind, { box: string; Icon: Icon; icon: string; filled: boolean }> = {
  premium: {
    box: 'min-h-badge-h gap-4 bg-badge-premium-bg px-8 text-on-strong',
    Icon: CrownSimpleIcon,
    icon: 'size-icon-s text-amber',
    filled: true,
  },
  private: {
    box: 'gap-6 bg-bg px-12 py-6 text-ink',
    Icon: LockSimpleIcon,
    icon: 'size-icon-s',
    filled: false,
  },
};

/**
 * Badge laid on a photo: its icon, then its label. The page places it (`className`) and decides
 * whether a screen reader reads it here or elsewhere (`hidden`).
 */
export function Badge({
  kind,
  label,
  hidden = false,
  className,
}: {
  kind: BadgeKind;
  label: string;
  /** Read elsewhere in the page (Premium: after the title, E-21). */
  hidden?: boolean;
  className?: string;
}) {
  const look = looks[kind];
  return (
    <span
      aria-hidden={hidden || undefined}
      className={clsx('flex items-center rounded-pill text-label-strong', look.box, className)}
    >
      <look.Icon aria-hidden weight={look.filled ? 'fill' : 'regular'} className={look.icon} />
      {label}
    </span>
  );
}
