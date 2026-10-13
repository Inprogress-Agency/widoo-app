import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { labels, type ModerationHistoryEntry } from '@widoo/shared';
import { SideCard } from './SideCard';

const texts = messages.moderation.sheet.history;

/** Decisions already taken on the route, the most recent first, with reason and message. */
export function HistoryCard({ history }: { history: ModerationHistoryEntry[] }) {
  return (
    <SideCard title={texts.title}>
      {history.length === 0 ? (
        <p className="text-body-s text-muted-foreground">{texts.empty}</p>
      ) : (
        <ol className="flex flex-col gap-12">
          {history.map((entry) => (
            <li key={entry.createdAt} className="flex flex-col gap-4 text-body-s">
              <span className="font-bold">
                {texts.by(texts.actions[entry.action], entry.actorName)}
              </span>
              <span className="text-label text-muted-foreground">
                {formatRelativeDate(new Date(entry.createdAt))}
                {entry.reasonCode ? ` · ${labels.fr.rejectionReasons[entry.reasonCode]}` : null}
              </span>
              {entry.message ? <span className="whitespace-pre-line">{entry.message}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </SideCard>
  );
}
