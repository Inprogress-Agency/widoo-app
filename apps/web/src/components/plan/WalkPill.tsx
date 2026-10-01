import { PersonSimpleWalkIcon } from '@phosphor-icons/react/ssr';
import clsx from 'clsx';

/** Walking time between two steps on a plan: « 20 min à pied » (E-21). */
export function WalkPill({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={clsx(
        'flex items-center gap-4 whitespace-nowrap rounded-pill bg-blue-soft px-8 py-4 text-label-strong text-blue-ink',
        className,
      )}
    >
      <PersonSimpleWalkIcon aria-hidden weight="bold" className="size-icon-s" />
      {text}
    </span>
  );
}
