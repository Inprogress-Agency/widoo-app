import { RouteStatusBadge } from '@/components/routes/RouteStatusBadge';
import { formatRelativeDate } from '@/lib/dates';
import { planLabelOf } from '@/lib/user-display';
import { messages } from '@/messages/fr';
import type { AdminUserDetail } from '@widoo/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { UserRoleBadge } from './UserRoleBadge';

const texts = messages.users.panel;

/** A line of the panel: what it is on the left, its value on the right. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

/** A titled list of objects of the account, or « Aucun ». */
function Section({ title, children }: { title: string; children: ReactNode[] }) {
  return (
    <section className="flex flex-col gap-8">
      <h3 className="text-label-strong">{title}</h3>
      {children.length === 0 ? (
        <p className="text-body-s text-muted-foreground">{texts.none}</p>
      ) : (
        <ul className="flex flex-col gap-8">{children}</ul>
      )}
    </section>
  );
}

type UserPanelContentProps = {
  user: AdminUserDetail;
  /** Address of the sheet of a route, to open it from the card. */
  routePathOf: (routeId: string) => string;
};

/** The card of an account inside the detail panel (A-06): profile, plan, routes, reports. */
export function UserPanelContent({ user, routePathOf }: UserPanelContentProps) {
  const routeLink = (route: { id: string; title: string }) => (
    <Link href={routePathOf(route.id)} className="text-blue-ink underline">
      {route.title}
    </Link>
  );
  const reportItem = (report: AdminUserDetail['reportsMade'][number]) => (
    <li key={report.id} className="flex flex-col text-body-s">
      <span>{routeLink(report.route)}</span>
      <span className="text-label text-muted-foreground">
        {messages.reports.reasons[report.reason]} ·{' '}
        {messages.reports.routes.statuses[report.status]} ·{' '}
        {formatRelativeDate(new Date(report.createdAt))}
      </span>
    </li>
  );
  const ratingItem = (rating: AdminUserDetail['ratingsGiven'][number]) => (
    <li key={rating.id} className="flex flex-col text-body-s">
      <span>{routeLink(rating.route)}</span>
      <span className="text-label text-muted-foreground">
        {texts.ratingScore(rating.score)} · {formatRelativeDate(new Date(rating.createdAt))}
        {rating.isHidden ? ` · ${messages.reports.ratings.hidden}` : ''}
      </span>
      {rating.comment ? <span className="break-words">{rating.comment}</span> : null}
    </li>
  );
  return (
    <div className="flex flex-col gap-16">
      <dl className="flex flex-col gap-8">
        <Line label={texts.email}>{user.email ?? messages.users.noEmail}</Line>
        <Line label={texts.id}>
          <span className="text-label">{user.id}</span>
        </Line>
        <Line label={texts.role}>
          <UserRoleBadge role={user.role} />
        </Line>
        <Line label={texts.plan}>{planLabelOf(user.plan)}</Line>
        <Line label={texts.joined}>{formatRelativeDate(new Date(user.createdAt))}</Line>
        <Line label={texts.profile}>
          {user.isPublic && user.suspendedAt === null ? texts.profilePublic : texts.profileMasked}
        </Line>
        {user.suspensionReason ? (
          <Line label={texts.suspension}>{user.suspensionReason}</Line>
        ) : null}
        <Line label={texts.certification}>
          <span className="flex flex-col items-end">
            {user.certification.isCertified ? texts.certified : texts.notCertified}
            <span className="text-label text-muted-foreground">
              {texts.certificationDetail(
                user.certification.computed,
                texts.overrides[user.certification.override],
              )}
            </span>
          </span>
        </Line>
      </dl>
      <Section title={texts.unlocked}>
        {user.unlockedRoutes.map((route) => (
          <li key={route.id} className="text-body-s">
            {routeLink(route)}
            {route.source === 'gift' ? (
              <span className="text-label text-muted-foreground"> · {texts.gift}</span>
            ) : null}
          </li>
        ))}
      </Section>
      <Section title={texts.created}>
        {user.createdRoutes.map((route) => (
          <li key={route.id} className="flex items-center justify-between gap-8 text-body-s">
            {routeLink(route)}
            <RouteStatusBadge status={route.status} />
          </li>
        ))}
      </Section>
      <Section title={texts.reportsMade}>{user.reportsMade.map(reportItem)}</Section>
      <Section title={texts.reportsReceived}>{user.reportsReceived.map(reportItem)}</Section>
      <Section title={texts.ratingsGiven}>{user.ratingsGiven.map(ratingItem)}</Section>
      <Section title={texts.ratingsReceived}>{user.ratingsReceived.map(ratingItem)}</Section>
      <Section title={texts.support}>
        {user.supportMessages.map((message) => (
          <li key={message.id} className="text-body-s">
            {messages.users.topics[message.topic]} ·{' '}
            {formatRelativeDate(new Date(message.createdAt))}
            <span className="text-label text-muted-foreground">
              {' '}
              · {message.handledAt ? texts.handled : texts.unhandled}
            </span>
          </li>
        ))}
      </Section>
    </div>
  );
}
