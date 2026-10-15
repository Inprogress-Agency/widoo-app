import { RouteStatusBadge } from '@/components/routes/RouteStatusBadge';
import { messages } from '@/messages/fr';
import type { AdminRouteReport } from '@widoo/shared';
import type { ReactNode } from 'react';

const texts = messages.reports.routes.panel;

/** A line of the panel: what it is on the left, its value on the right. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

/** What a report says, inside the detail panel: the route, who reported it, why, and where. */
export function ReportPanelContent({ report }: { report: AdminRouteReport }) {
  const isLowRating = report.reason === 'low_rating';
  return (
    <>
      {isLowRating ? (
        <p className="rounded-photo bg-alert-soft p-12 text-body-s text-alert">
          {texts.lowRatingHint}
        </p>
      ) : null}
      <dl className="flex flex-col gap-8">
        <Line label={messages.reports.routes.columns.route}>
          <span className="flex flex-col items-end gap-4">
            {report.route.title}
            <RouteStatusBadge status={report.route.status} />
          </span>
        </Line>
        <Line label={texts.city}>{report.route.cityName}</Line>
        <Line label={texts.author}>
          {report.author?.firstName ??
            (report.route.isOfficial ? messages.reports.routes.team : messages.moderation.noAuthor)}
        </Line>
        {isLowRating ? null : (
          <Line label={texts.reportedBy}>
            {report.reporter?.firstName ?? messages.reports.routes.unknown}
          </Line>
        )}
        {report.step ? (
          <Line label={texts.step}>
            {messages.reports.routes.stepOf(report.step.position, report.step.placeName)}
          </Line>
        ) : null}
        <Line label={texts.comment}>
          {report.comment ?? <span className="text-muted-foreground">{texts.noComment}</span>}
        </Line>
      </dl>
    </>
  );
}
