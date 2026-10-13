import { useMinuteTick } from '@/hooks/useMinuteTick';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr';

type RefreshStatusProps = {
  /** When the figures shown were read. */
  readAt: Date;
  onRefresh: () => void;
};

/** « Mis à jour il y a 2 min » and the button that reads the figures again. */
export function RefreshStatus({ readAt, onRefresh }: RefreshStatusProps) {
  useMinuteTick();
  return (
    <span className="flex items-center gap-8 text-body-s text-muted-foreground">
      {messages.dashboard.updated(formatRelativeDate(readAt))}
      <button
        type="button"
        onClick={onRefresh}
        aria-label={messages.dashboard.refresh}
        className="flex size-32 items-center justify-center rounded-pill text-foreground hover:bg-accent"
      >
        <ArrowClockwiseIcon aria-hidden className="size-18" />
      </button>
    </span>
  );
}
