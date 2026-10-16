import { messages } from '@/messages/fr';
import type { RevisionChange } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';

const texts = messages.moderation.sheet.changes;
const dayAndMonth = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
});

const subjectLabel = (subject: RevisionChange['subject']) =>
  subject.kind === 'step' ? texts.subjects.step(subject.number) : texts.subjects[subject.kind];

/** What one change says: a rewritten text side by side, anything else in a sentence. */
function ChangeDetail({ change }: { change: RevisionChange }) {
  if (change.change === 'modified') {
    return (
      <div className="grid grid-cols-2 gap-8">
        <p className="flex flex-col gap-4 rounded-photo bg-error-soft p-12 text-body-s">
          <span className="text-label-strong text-error-ink">{texts.before}</span>
          {change.before}
        </p>
        <p className="flex flex-col gap-4 rounded-photo bg-green-soft p-12 text-body-s">
          <span className="text-label-strong text-green-ink">{texts.after}</span>
          {change.after}
        </p>
      </div>
    );
  }
  return (
    <p className="text-body-s">
      {change.change === 'duration_changed' ? `${texts.duration} ` : null}
      {change.change === 'replaced' ? (
        <del className="text-muted-foreground">{change.before}</del>
      ) : (
        change.before
      )}{' '}
      {texts.becomes} {change.after}
    </p>
  );
}

type RevisionChangesProps = {
  changes: RevisionChange[];
  /** When the version still online was published. */
  publishedVersionAt: Date | null;
};

/**
 * « Changements depuis la version publiée »: what a revision changed, one row per change.
 * Nothing for a first submission.
 */
export function RevisionChanges({ changes, publishedVersionAt }: RevisionChangesProps) {
  if (changes.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col">
      <div className="flex items-baseline justify-between gap-16 pb-12">
        <h3 className="text-title-s">{texts.title}</h3>
        {publishedVersionAt ? (
          <span className="text-label text-muted-foreground">
            {texts.version(dayAndMonth.format(publishedVersionAt))}
          </span>
        ) : null}
      </div>
      <ul>
        {changes.map((change, index) => (
          <li key={index} className="grid grid-cols-change gap-16 border-t border-border py-16">
            <span className="text-control">{subjectLabel(change.subject)}</span>
            <div className="flex flex-col items-start gap-10">
              <StatusBadge tone="info">{texts.kinds[change.change]}</StatusBadge>
              <ChangeDetail change={change} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
