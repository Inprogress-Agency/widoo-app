'use client';

import { RequestChangesDialog } from '@/components/moderation/sheet/RequestChangesDialog';
import { ReportActions, type ReportActionName } from '@/components/reports/ReportActions';
import { ReportNoteDialog } from '@/components/reports/ReportNoteDialog';
import { RouteReasonDialog } from '@/components/routes/RouteReasonDialog';
import { catalogRoutePathOf } from '@/containers/CatalogRoutesContainer';
import { useRouteReportActions } from '@/hooks/useRouteReportActions';
import { isRejectionReason } from '@/lib/rejection-reason';
import { messages } from '@/messages/fr';
import type { AdminRouteReport } from '@widoo/shared';
import { useState } from 'react';

const texts = messages.reports.routes.dialogs;

type ReportDecisionsContainerProps = {
  report: AdminRouteReport;
  /** The report is decided: the list reads again and the panel closes. */
  onSettled: () => void;
};

/**
 * The decisions on one open report (A-03): the buttons that fit its reason, and the window each
 * one opens (a note, a message to the author, or a reason to take the route offline).
 */
export function ReportDecisionsContainer({ report, onSettled }: ReportDecisionsContainerProps) {
  const [openAction, setOpenAction] = useState<ReportActionName | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const close = () => setOpenAction(null);
  const actions = useRouteReportActions({ id: report.id, routeId: report.route.id }, () => {
    close();
    onSettled();
  });

  const handleAct = (action: ReportActionName) => {
    setNote('');
    setMessage('');
    setReasonCode('');
    setOpenAction(action);
  };
  const noteDialog = (action: 'accept' | 'reject' | 'keep') => ({
    isOpen: openAction === action,
    dialog: texts[action],
    note,
    onNoteChange: setNote,
    onCancel: close,
    onConfirm: () => void actions[action](note),
    isBusy: actions.isBusy,
  });

  return (
    <>
      <ReportActions
        isLowRating={report.reason === 'low_rating'}
        routePath={catalogRoutePathOf(report.route.id)}
        onAct={handleAct}
        isBusy={actions.isBusy}
      />
      <ReportNoteDialog {...noteDialog('accept')} />
      <ReportNoteDialog {...noteDialog('reject')} />
      <ReportNoteDialog {...noteDialog('keep')} />
      <RequestChangesDialog
        isOpen={openAction === 'requestChanges'}
        message={message}
        onMessageChange={setMessage}
        onCancel={close}
        onConfirm={() => void actions.requestChanges(message)}
        isBusy={actions.isBusy}
      />
      <RouteReasonDialog
        id="report-unpublish"
        texts={texts.unpublish}
        isOpen={openAction === 'unpublish'}
        reasonCode={reasonCode}
        onReasonCodeChange={setReasonCode}
        message={message}
        onMessageChange={setMessage}
        onCancel={close}
        onConfirm={() =>
          isRejectionReason(reasonCode) && void actions.unpublish(reasonCode, message)
        }
        isBusy={actions.isBusy}
      />
    </>
  );
}
