'use client';

import { AuthorCard } from '@/components/moderation/sheet/AuthorCard';
import { CoherenceWarnings } from '@/components/moderation/sheet/CoherenceWarnings';
import { DecisionPanel } from '@/components/moderation/sheet/DecisionPanel';
import { HistoryCard } from '@/components/moderation/sheet/HistoryCard';
import { PublishedPanel } from '@/components/moderation/sheet/PublishedPanel';
import { RejectDialog } from '@/components/moderation/sheet/RejectDialog';
import { RequestChangesDialog } from '@/components/moderation/sheet/RequestChangesDialog';
import { RevisionChanges } from '@/components/moderation/sheet/RevisionChanges';
import { RoutePreview } from '@/components/moderation/sheet/RoutePreview';
import { SheetHeader } from '@/components/moderation/sheet/SheetHeader';
import { SheetNavigation, sheetPathOf } from '@/components/moderation/sheet/SheetNavigation';
import { StepList } from '@/components/moderation/sheet/StepList';
import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { useModerationDecision } from '@/hooks/useModerationDecision';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { formatDayMonth, isWaitingLate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { taxonomies, type RejectionReason } from '@widoo/shared';
import { Button } from '@widoo/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const isRejectionReason = (code: string): code is RejectionReason =>
  taxonomies.rejectionReasons.some((reason) => reason === code);

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

  // Set once the route is published: the sheet stays, with the way on, instead of moving away.
  const [publishedTo, setPublishedTo] = useState<{ nextPath: string } | null>(null);

  const nextId = sheet.status === 'ready' ? sheet.data.queue?.nextId : null;
  const nextPath = nextId ? sheetPathOf(nextId) : sectionPaths.moderation;
  const reload = sheet.status === 'loading' ? undefined : sheet.reload;
  const decision = useModerationDecision(routeId, (outcome) => {
    setOpenDialog(null);
    if (outcome === 'published') {
      setPublishedTo({ nextPath });
      reload?.();
      return;
    }
    router.push(nextPath);
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
      <SheetHeader
        route={route}
        isLate={route.status === 'pending' && isWaitingLate(new Date(route.waitingSince))}
      />
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
          {publishedTo ? (
            <PublishedPanel
              publishedBy={route.history[0]?.actorFirstName ?? null}
              onNext={() => router.push(publishedTo.nextPath)}
              onBackToCatalog={() => router.push(sectionPaths.catalog)}
            />
          ) : route.status === 'pending' ? (
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
      <RejectDialog
        isOpen={openDialog === 'reject'}
        authorFirstName={route.author?.firstName ?? null}
        publishedVersionOn={
          route.isRevision && route.publishedVersionAt
            ? formatDayMonth(new Date(route.publishedVersionAt))
            : null
        }
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
