import { formatCount } from '@/lib/numbers';
import { ArrowRightIcon, WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@widoo/ui';
import Link from 'next/link';

type ToHandleTileProps = {
  /** The list the tile opens, already filtered on what waits. */
  href: string;
  icon: Icon;
  label: string;
  count: number;
  /** Line under the figure: « Le plus ancien attend depuis 3 j 4 h ». */
  detail: string;
  /** Something has been waiting for more than 72 hours: the detail turns red, with an icon. */
  isLate: boolean;
};

/** A tile « à traiter » of the dashboard, a link to its list as a whole. */
export function ToHandleTile({
  href,
  icon: IconOf,
  label,
  count,
  detail,
  isLate,
}: ToHandleTileProps) {
  return (
    <Link href={href} className="flex flex-col gap-8 rounded-photo bg-secondary p-16 hover:bg-line">
      <span className="flex items-center gap-10">
        <span className="flex size-chip-h items-center justify-center rounded-pill bg-background">
          <IconOf aria-hidden className="size-18" />
        </span>
        <span className="text-control">{label}</span>
        <ArrowRightIcon aria-hidden className="ml-auto size-18" />
      </span>
      <span className="text-figure">{formatCount(count)}</span>
      <span
        className={cn(
          'flex items-center gap-6 text-body-s',
          isLate ? 'font-bold text-destructive' : 'text-muted-foreground',
        )}
      >
        {isLate ? <WarningCircleIcon aria-hidden weight="fill" className="size-16" /> : null}
        {detail}
      </span>
    </Link>
  );
}
