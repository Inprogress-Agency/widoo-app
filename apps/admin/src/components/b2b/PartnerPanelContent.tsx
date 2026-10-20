import { dayLabelOf, monthlyPriceLabelOf } from '@/lib/partner-display';
import { messages } from '@/messages/fr';
import type { B2bClient } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PartnerStatusBadge } from './PartnerStatusBadge';

const texts = messages.b2b.panel;

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

const noValue = <span className="text-muted-foreground">{messages.b2b.noValue}</span>;

type PartnerPanelContentProps = {
  partner: B2bClient;
  /** Address of the sheet of a route, to open it from the card. */
  routePathOf: (routeId: string) => string;
};

/** The card of a partner in the detail panel (A-10): contact, contract, notes and routes. */
export function PartnerPanelContent({ partner, routePathOf }: PartnerPanelContentProps) {
  return (
    <div className="flex flex-col gap-16">
      <dl className="flex flex-col gap-8">
        <Line label={texts.type}>{messages.b2b.types[partner.type]}</Line>
        <Line label={texts.status}>
          <PartnerStatusBadge status={partner.status} />
        </Line>
        <Line label={texts.contactName}>{partner.contactName ?? noValue}</Line>
        <Line label={texts.contactEmail}>{partner.contactEmail ?? noValue}</Line>
        <Line label={texts.contactPhone}>{partner.contactPhone ?? noValue}</Line>
        <Line label={texts.address}>{partner.address ?? noValue}</Line>
        <Line label={texts.price}>{monthlyPriceLabelOf(partner.monthlyPriceCents) ?? noValue}</Line>
        <Line label={texts.started}>{dayLabelOf(partner.startedAt) ?? noValue}</Line>
        <Line label={texts.source}>
          <span className="text-label">{partner.source}</span>
        </Line>
      </dl>
      {partner.notes ? (
        <section className="flex flex-col gap-8">
          <h3 className="text-label-strong">{texts.notes}</h3>
          <p className="whitespace-pre-line break-words text-body-s">{partner.notes}</p>
        </section>
      ) : null}
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">{texts.routes}</h3>
        {partner.routes.length === 0 ? (
          <p className="text-body-s text-muted-foreground">{texts.noRoute}</p>
        ) : (
          <ol className="flex flex-col gap-8">
            {partner.routes.map((route) => (
              <li key={route.id} className="flex items-center justify-between gap-8 text-body-s">
                <Link href={routePathOf(route.id)} className="text-blue-ink underline">
                  {texts.routePosition(route.position + 1)} {route.title}
                </Link>
                {route.isPublished ? null : (
                  <StatusBadge tone="neutral">{texts.notPublished}</StatusBadge>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
