import { cn } from '../lib/cn';

type CountBadgeProps = {
  count: number;
  /** Something has been waiting for too long: red, never by the color alone (see `label`). */
  isLate?: boolean;
  /** What a screen reader says instead of the number: « 12 parcours à relire, dont 2 en retard ». */
  label: string;
  className?: string;
};

/** Number of things to handle, in a pill next to a navigation entry or on its icon. */
export function CountBadge({ count, isLate = false, label, className }: CountBadgeProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'inline-flex min-w-20 items-center justify-center rounded-pill px-6 text-number-s',
        isLate ? 'bg-error-soft text-error-ink' : 'bg-background text-foreground',
        className,
      )}
    >
      {count}
    </span>
  );
}
