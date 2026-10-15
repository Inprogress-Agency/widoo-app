import { RouteStatusBadge } from '@/components/routes/RouteStatusBadge';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminRouteReport } from '@widoo/shared';
import { Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';
import { ReportReasonBadge } from './ReportReasonBadge';

const texts = messages.reports.routes;
const columnCount = 5;

type RouteReportsTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: AdminRouteReport[];
  isLoading: boolean;
  /** The report whose decisions are open in the detail panel. */
  openId: string | null;
  onOpen: (report: AdminRouteReport) => void;
};

/** The open reports of routes as a table (A-03), oldest first; a row opens its decisions. */
export function RouteReportsTable({ items, isLoading, openId, onOpen }: RouteReportsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.route}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.reason}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.reporter}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.author}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.since}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((report) => (
            <TableRow key={report.id} onOpen={() => onOpen(report)} isOpen={report.id === openId}>
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{report.route.title}</span>
                  <span className="flex flex-wrap items-center gap-8 text-label text-muted-foreground">
                    {report.route.cityName}
                    <RouteStatusBadge status={report.route.status} />
                    {report.openOnRoute > 1 ? texts.otherOpen(report.openOnRoute) : null}
                  </span>
                </span>
              </TableCell>
              <TableCell className="py-8">
                <span className="flex flex-col items-start gap-4">
                  <ReportReasonBadge reason={report.reason} />
                  {report.step ? (
                    <span className="text-label text-muted-foreground">
                      {texts.stepOf(report.step.position, report.step.placeName)}
                    </span>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>
                {report.reason === 'low_rating' ? (
                  <span className="text-muted-foreground">{texts.noReporter}</span>
                ) : (
                  (report.reporter?.firstName ?? (
                    <span className="text-muted-foreground">{texts.unknown}</span>
                  ))
                )}
              </TableCell>
              <TableCell>
                {report.author ? (
                  (report.author.firstName ?? '')
                ) : (
                  <span className="text-muted-foreground">
                    {report.route.isOfficial ? texts.team : messages.moderation.noAuthor}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatRelativeDate(new Date(report.createdAt))}
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
