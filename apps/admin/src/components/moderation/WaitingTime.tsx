import { formatWaitingTime } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@widoo/ui';

type WaitingTimeProps = {
  /** Since when the route waits in the queue. */
  since: Date;
  /** Waiting for more than 72 hours: red, with an icon and « en retard » for screen readers. */
  isLate: boolean;
};

/** Time spent in the queue: « 9 h », « 3 j 4 h ». Lateness is never told by the red alone. */
export function WaitingTime({ since, isLate }: WaitingTimeProps) {
  return (
    <span className={cn('inline-flex items-center gap-6', isLate && 'font-bold text-destructive')}>
      {isLate ? <WarningCircleIcon aria-hidden weight="fill" className="size-16" /> : null}
      {formatWaitingTime(since)}
      {isLate ? <span className="sr-only">, {messages.moderation.late}</span> : null}
    </span>
  );
}
