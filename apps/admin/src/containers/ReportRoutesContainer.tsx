'use client';

import { ReportPanelContent } from '@/components/reports/ReportPanelContent';
import { ReportReasonBadge } from '@/components/reports/ReportReasonBadge';
import { reportsPaths } from '@/components/reports/ReportsTabs';
import { RouteReportsTable } from '@/components/reports/RouteReportsTable';
import { PageMessage } from '@/components/states/PageMessage';
import { reasonFilterValues, reportsListOptions, toReportsParams } from '@/config/reports-list';
import { ReportDecisionsContainer } from '@/containers/ReportDecisionsContainer';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { Button, DetailPanel, FilterMenu, Pagination } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';

const texts = messages.reports.routes;
/** Parameter of the address that holds the report whose decisions are open next to the list. */
const openReportParam = 'signalement';

const reasonOptions = Object.entries(reasonFilterValues).map(([value, reason]) => ({
  value,
  label: messages.reports.reasons[reason],
}));

/**
 * A-03, the open reports of routes: the list the address asks for, and next to it the decisions
 * on the report the address names. A report that is decided leaves the list.
 */
export function ReportRoutesContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openReportParam);
  const { query, handleFilter, handlePage } = useListQuery(reportsListOptions);
  const listAddress = serializeListQuery(query, reportsListOptions);
  const reports = useRemoteData(listAddress, (signal) =>
    getSessionClients().api.getAdminReports(toReportsParams(query), signal),
  );
  const data = reports.status === 'ready' ? reports.data : undefined;
  const openReport = data?.items.find((report) => report.id === openId);
  const reload = reports.status === 'loading' ? undefined : reports.reload;

  /** The address of the list as it is, with the decisions of `reportId` open, or none. */
  const showReport = (reportId: string | null) => {
    const params = new URLSearchParams(listAddress);
    if (reportId) {
      params.set(openReportParam, reportId);
    }
    const address = params.toString();
    router.replace(address ? `${reportsPaths.routes}?${address}` : reportsPaths.routes, {
      scroll: false,
    });
  };

  const renderList = () => {
    if (reports.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={reports.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <RouteReportsTable
        items={data?.items ?? []}
        isLoading={reports.status === 'loading'}
        openId={openId}
        onOpen={(report) => showReport(report.id)}
      />
    );
  };

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
          <div role="group" aria-label={texts.filters.label}>
            <FilterMenu
              label={texts.filters.reason}
              options={reasonOptions}
              value={query.filters.motif ?? null}
              onChange={(reason) => handleFilter('motif', reason ?? query.filters.motif ?? '')}
            />
          </div>
          {data ? (
            <p className="text-body-s text-muted-foreground">{texts.total(data.total)}</p>
          ) : null}
        </div>
        {renderList()}
        {data && data.items.length > 0 ? (
          <div className="flex items-center justify-between gap-16">
            <p className="text-label text-muted-foreground">
              {messages.list.range(data.offset + 1, data.offset + data.items.length, data.total)}
            </p>
            <Pagination
              label={messages.list.pages}
              previousLabel={messages.list.previous}
              nextLabel={messages.list.next}
              onPrevious={
                data.previousCursor === null ? undefined : () => handlePage(data.previousCursor)
              }
              onNext={data.nextCursor === null ? undefined : () => handlePage(data.nextCursor)}
            />
          </div>
        ) : null}
      </div>
      {openReport ? (
        <DetailPanel
          key={openReport.id}
          title={openReport.route.title}
          status={<ReportReasonBadge reason={openReport.reason} />}
          closeLabel={messages.confirm.close}
          onClose={() => showReport(null)}
          actions={
            <ReportDecisionsContainer
              report={openReport}
              onSettled={() => {
                showReport(null);
                reload?.();
              }}
            />
          }
        >
          <ReportPanelContent report={openReport} />
        </DetailPanel>
      ) : null}
    </div>
  );
}
