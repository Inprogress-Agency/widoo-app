import { CheckIcon } from '@phosphor-icons/react/dist/ssr';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

type FilterChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  label: string;
  /** The filter applies: dark pill with a check, as the active chips of the app. */
  isActive: boolean;
  /** How many rows the filter holds, after the label. */
  count?: number;
};

/** A filter of a list, as a pill of 32 px that toggles. */
export function FilterChip({ label, isActive, count, className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={cn(
        'inline-flex min-h-32 items-center gap-6 rounded-pill px-12 text-control',
        isActive
          ? 'bg-surface-strong text-on-strong'
          : 'bg-secondary text-secondary-foreground hover:bg-line',
        className,
      )}
      {...props}
    >
      {isActive ? <CheckIcon aria-hidden className="size-16" /> : null}
      {label}
      {count === undefined ? null : (
        <span className={isActive ? 'text-on-strong-muted' : 'text-muted-foreground'}>{count}</span>
      )}
    </button>
  );
}
