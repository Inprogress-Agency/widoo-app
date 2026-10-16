import { formatFullDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AffiliateProgram } from '@widoo/shared';
import type { ReactNode } from 'react';

const texts = messages.affiliation.programs;

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

/** A program in the detail panel (A-09): its network, commission, cookie and the places it serves. */
export function ProgramPanelContent({ program }: { program: AffiliateProgram }) {
  return (
    <div className="flex flex-col gap-16">
      {program.isActive ? null : (
        <p className="rounded-photo bg-alert-soft p-12 text-body-s text-alert">
          {texts.panel.inactiveHint}
        </p>
      )}
      <dl className="flex flex-col gap-8">
        <Line label={texts.panel.network}>{program.network}</Line>
        <Line label={texts.panel.commission}>
          {program.commissionNote ?? (
            <span className="text-muted-foreground">{texts.noCommission}</span>
          )}
        </Line>
        <Line label={texts.panel.cookie}>{texts.cookieDays(program.cookieDays)}</Line>
        <Line label={texts.panel.places}>{program.placeCount}</Line>
        <Line label={texts.panel.status}>
          {program.isActive ? texts.status.active : texts.status.inactive}
        </Line>
        <Line label={messages.users.panel.joined}>
          {formatFullDate(new Date(program.createdAt))}
        </Line>
      </dl>
    </div>
  );
}
