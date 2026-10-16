import {
  actionLabelOf,
  isTargetGone,
  targetNameOf,
  targetPathOf,
  targetTypeLabelOf,
} from '@/lib/action-display';
import { formatFullDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminActionItem } from '@widoo/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';

const texts = messages.actionLog.panel;

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

/** A state of the target, as the journal kept it: the JSON, or « Rien à afficher ». */
function State({ title, state }: { title: string; state: unknown }) {
  return (
    <section className="flex flex-col gap-8">
      <h3 className="text-label-strong">{title}</h3>
      {state === null || state === undefined ? (
        <p className="text-body-s text-muted-foreground">{texts.noState}</p>
      ) : (
        <pre className="overflow-x-auto rounded-photo bg-secondary p-12 text-label">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
    </section>
  );
}

/** A line of the journal in the detail panel (A-12): what was done, and the state before and after. */
export function ActionPanelContent({ action }: { action: AdminActionItem }) {
  const targetPath = targetPathOf(action.targetType, action.targetId);
  const targetName = targetNameOf(action);
  const isGone = isTargetGone(action);
  return (
    <div className="flex flex-col gap-16">
      <dl className="flex flex-col gap-8">
        <Line label={texts.when}>{formatFullDate(new Date(action.createdAt))}</Line>
        <Line label={texts.actor}>{action.actor?.name ?? messages.actionLog.unknownActor}</Line>
        <Line label={texts.action}>{actionLabelOf(action.action)}</Line>
        <Line label={texts.target}>
          <span className="flex flex-col items-end">
            {targetName ?? targetTypeLabelOf(action.targetType)}
            <span className="text-label text-muted-foreground">
              {targetName ? `${targetTypeLabelOf(action.targetType)} · ` : ''}
              {action.targetId}
            </span>
            {isGone ? (
              <span className="text-label text-muted-foreground">{texts.targetGone}</span>
            ) : targetPath ? (
              <Link href={targetPath} className="text-blue-ink underline">
                {texts.openTarget}
              </Link>
            ) : null}
          </span>
        </Line>
        <Line label={texts.reason}>
          {action.reason ?? <span className="text-muted-foreground">{texts.noReason}</span>}
        </Line>
      </dl>
      <State title={texts.before} state={action.before} />
      <State title={texts.after} state={action.after} />
    </div>
  );
}
