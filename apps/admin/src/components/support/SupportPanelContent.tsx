import { formatFullDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminSupportMessage } from '@widoo/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SupportStatusBadge } from './SupportStatusBadge';

const texts = messages.support.panel;

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

type SupportPanelContentProps = {
  message: AdminSupportMessage;
  /** Address of the card of an account (A-06), to open it from the message. */
  accountPathOf: (userId: string) => string;
};

/** A message in the detail panel (A-13): what was written, who wrote it, and what the app joined. */
export function SupportPanelContent({ message, accountPathOf }: SupportPanelContentProps) {
  return (
    <div className="flex flex-col gap-16">
      <dl className="flex flex-col gap-8">
        <Line label={texts.status}>
          <SupportStatusBadge isHandled={message.handledAt !== null} />
        </Line>
        <Line label={texts.sentAt}>{formatFullDate(new Date(message.createdAt))}</Line>
        {message.handledAt ? (
          <Line label={texts.handledAt}>{formatFullDate(new Date(message.handledAt))}</Line>
        ) : null}
        <Line label={texts.account}>
          {message.author ? (
            <Link href={accountPathOf(message.author.id)} className="text-blue-ink underline">
              {message.author.firstName ?? messages.support.unnamedAccount}
            </Link>
          ) : (
            <span className="text-muted-foreground">{messages.support.noAccount}</span>
          )}
        </Line>
        <Line label={texts.replyEmail}>
          <a href={`mailto:${message.replyEmail}`} className="text-blue-ink underline">
            {message.replyEmail}
          </a>
        </Line>
        <Line label={texts.appVersion}>{message.appVersion}</Line>
        <Line label={texts.device}>{message.device}</Line>
        <Line label={texts.locale}>{texts.locales[message.locale]}</Line>
      </dl>
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">{texts.message}</h3>
        <p className="whitespace-pre-line break-words text-body-s">{message.message}</p>
      </section>
      {message.handledAt ? null : (
        <p className="rounded-photo bg-secondary p-12 text-body-s text-muted-foreground">
          {texts.howToAnswer(message.locale)}
        </p>
      )}
    </div>
  );
}
