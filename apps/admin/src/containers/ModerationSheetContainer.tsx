'use client';

import { AuthorCard } from '@/components/moderation/sheet/AuthorCard';
import { CoherenceWarnings } from '@/components/moderation/sheet/CoherenceWarnings';
import { DecisionPanel } from '@/components/moderation/sheet/DecisionPanel';
import { HistoryCard } from '@/components/moderation/sheet/HistoryCard';
import { RequestChangesDialog } from '@/components/moderation/sheet/RequestChangesDialog';
import { RevisionChanges } from '@/components/moderation/sheet/RevisionChanges';
import { RoutePreview } from '@/components/moderation/sheet/RoutePreview';
import { SheetHeader } from '@/components/moderation/sheet/SheetHeader';
import { SheetNavigation, sheetPathOf } from '@/components/moderation/sheet/SheetNavigation';
import { StepList } from '@/components/moderation/sheet/StepList';
import { RouteReasonDialog } from '@/components/routes/RouteReasonDialog';
import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { useModerationDecision } from '@/hooks/useModerationDecision';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { isWaitingLate } from '@/lib/dates';
import { isRejectionReason } from '@/lib/rejection-reason';
import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type OpenDialog = 'requestChanges' | 'reject' | null;

/**
 * A-02, the moderation sheet of a route: reads it, shows it as it will be published, and sends
 * the decision of the moderator. Once decided, the next route of the queue opens, or the queue.
 */
export function ModerationSheetContainer({ routeId }: { routeId: string }) {
  const router = useRouter();
  const sheet = useRemoteData(routeId, (signal) =>
    getSessionClients().api.getModerationRoute(routeId, signal),
  );
  const [checkedRules, setCheckedRules] = useState<ReadonlySet<number>>(new Set());
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [message, setMessage] = useState('');
  const [reasonCode, setReasonCode] = useState('');

  const nextId = sheet.status === 'ready' ? sheet.data.queue?.nextId : null;
  const decision = useModerationDecision(routeId, () => {
    setOpenDialog(null);
    router.push(nextId ? sheetPathOf(nextId) : sectionPaths.moderation);
  });

  if (sheet.status === 'loading') {
    return <PageMessage role="status" title={messages.shell.loading} />;
  }
  if (sheet.status === 'error') {
    return (
      <PageMessage
        role="alert"
        title={messages.moderation.sheet.error}
        action={<Button onClick={sheet.reload}>{messages.list.retry}</Button>}
      />
    );
  }

  const route = sheet.data;
  const handleToggleRule = (rule: number) =>
    setCheckedRules((current) => {
      const next = new Set(current);
      return next.delete(rule) ? next : next.add(rule);
    });
  const handleOpen = (dialog: OpenDialog) => {
    setMessage('');
    setReasonCode('');
    setOpenDialog(dialog);
  };

  return (
    <div className="flex flex-col gap-20">
      <SheetNavigation queue={route.queue} />
      <SheetHeader route={route} isLate={isWaitingLate(new Date(route.waitingSince))} />
      <div className="flex flex-col gap-24 lg:flex-row lg:items-start lg:gap-32">
        <div className="flex min-w-0 flex-1 flex-col gap-24">
          <CoherenceWarnings warnings={route.warnings} />
          <RevisionChanges
            changes={route.revisionChanges}
            publishedVersionAt={
              route.publishedVersionAt === null ? null : new Date(route.publishedVersionAt)
            }
          />
          <RoutePreview route={route} />
          <StepList steps={route.steps} />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-16 lg:w-decision">
          {route.status === 'pending' ? (
            <DecisionPanel
              checkedRules={checkedRules}
              onToggleRule={handleToggleRule}
              onPublish={() => void decision.publish()}
              onRequestChanges={() => handleOpen('requestChanges')}
              onReject={() => handleOpen('reject')}
              isBusy={decision.isBusy}
            />
          ) : null}
          {route.author ? <AuthorCard author={route.author} /> : null}
          <HistoryCard history={route.history} />
        </aside>
      </div>
      <RequestChangesDialog
        isOpen={openDialog === 'requestChanges'}
        message={message}
        onMessageChange={setMessage}
        onCancel={() => setOpenDialog(null)}
        onConfirm={() => void decision.requestChanges(message)}
        isBusy={decision.isBusy}
      />
      <RouteReasonDialog
        id="reject"
        texts={messages.moderation.decisions.rejectDialog}
        isOpen={openDialog === 'reject'}
        reasonCode={reasonCode}
        onReasonCodeChange={setReasonCode}
        message={message}
        onMessageChange={setMessage}
        onCancel={() => setOpenDialog(null)}
        onConfirm={() => isRejectionReason(reasonCode) && void decision.reject(reasonCode, message)}
        isBusy={decision.isBusy}
      />
    </div>
  );
}
