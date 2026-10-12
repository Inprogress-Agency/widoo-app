import { messages } from '@/messages/fr';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';

/** Coherence warnings still standing on a route: « 2 alertes » in amber, or « Aucune ». */
export function WarningCount({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground">{messages.moderation.noWarning}</span>;
  }
  return (
    <span className="inline-flex items-center gap-6 font-bold text-alert">
      <WarningIcon aria-hidden weight="fill" className="size-16" />
      {messages.moderation.warnings(count)}
    </span>
  );
}
