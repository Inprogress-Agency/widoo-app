import { LockSimpleIcon } from '@phosphor-icons/react/ssr';
import clsx from 'clsx';

/**
 * Label of a step on a plan: its time in bold, then its name, on a white pill (E-21). A locked
 * step of a Premium route shows its category in place of its name, followed by a lock.
 */
export function StepLabel({
  time,
  name,
  locked = false,
  className,
}: {
  time: string;
  name: string;
  locked?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'flex items-center gap-6 whitespace-nowrap rounded-pill bg-bg px-10 py-4',
        className,
      )}
    >
      <span className="text-label-strong text-ink">{time}</span>
      <span className="text-label-semibold text-ink">{name}</span>
      {locked && <LockSimpleIcon className="size-icon-s text-muted" />}
    </span>
  );
}
