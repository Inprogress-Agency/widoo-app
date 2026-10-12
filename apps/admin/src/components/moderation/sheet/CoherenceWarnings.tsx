import { messages } from '@/messages/fr';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';

/** Coherence warnings of the orchestration still standing, in an amber frame; nothing without. */
export function CoherenceWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-8 rounded-photo bg-alert-soft p-16 text-alert">
      <h3 className="flex items-center gap-8 text-control">
        <WarningIcon aria-hidden weight="fill" className="size-18" />
        {messages.moderation.sheet.warningsTitle(warnings.length)}
      </h3>
      <ul className="flex list-disc flex-col gap-4 pl-24 text-body-s text-foreground">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}
