import { messages } from '@/messages/fr';

const texts = messages.b2b.stats;

/**
 * The clicks and installs that came from the source of a partner (A-10). Not wired yet: no event
 * carries the source, and the admin does not read PostHog (ticket #346, Inbox of 2026-10-20).
 */
export function PartnerStats({ source }: { source: string }) {
  return (
    <section className="flex flex-col gap-8">
      <h3 className="text-label-strong">{texts.title}</h3>
      <p className="text-body-s text-muted-foreground">{texts.notWired(source)}</p>
    </section>
  );
}
