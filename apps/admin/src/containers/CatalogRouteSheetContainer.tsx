'use client';

import { CatalogRouteActions } from '@/components/catalog/CatalogRouteActions';
import { RepublishDialog } from '@/components/catalog/RepublishDialog';
import { AuthorCard } from '@/components/moderation/sheet/AuthorCard';
import { CoherenceWarnings } from '@/components/moderation/sheet/CoherenceWarnings';
import { HistoryCard } from '@/components/moderation/sheet/HistoryCard';
import { RoutePreview } from '@/components/moderation/sheet/RoutePreview';
import { SheetHeader } from '@/components/moderation/sheet/SheetHeader';
import { StepList } from '@/components/moderation/sheet/StepList';
import { RouteReasonDialog } from '@/components/routes/RouteReasonDialog';
import { BackLink } from '@/components/states/BackLink';
import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { useCatalogRouteActions } from '@/hooks/useCatalogRouteActions';
import { useRemoteData } from '@/hooks/useRemoteData';
import { useSession } from '@/hooks/useSession';
import { getSessionClients } from '@/lib/auth/clients';
import { isRejectionReason } from '@/lib/rejection-reason';
import { messages } from '@/messages/fr';
import { Button, ConfirmDialog } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.catalog.routes;
const routesPath = `${sectionPaths.catalog}/parcours`;

type OpenDialog = 'unpublish' | 'republish' | 'reassign' | null;

/**
 * A-04, the sheet of a route of the catalog: the route as it is published, read only, and the
 * actions of the team. The texts of a route are edited in the editor of the app, never here.
 */
export function CatalogRouteSheetContainer({ routeId }: { routeId: string }) {
  const { session } = useSession();
  const sheet = useRemoteData(routeId, (signal) =>
    getSessionClients().api.getModerationRoute(routeId, signal),
  );
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [message, setMessage] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const reload = sheet.status === 'loading' ? undefined : sheet.reload;
  const actions = useCatalogRouteActions(routeId, () => {
    setOpenDialog(null);
    reload?.();
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
  const isAdmin = session.status === 'signedIn' && session.member.role === 'admin';
  const isOnline = route.status === 'published' || route.status === 'needs_fix';
  const handleOpen = (dialog: OpenDialog) => {
    setMessage('');
    setReasonCode('');
    setOpenDialog(dialog);
  };

  return (
    <div className="flex flex-col gap-20">
      <BackLink href={routesPath} label={texts.sheet.back} />
      <SheetHeader route={route} isLate={false} />
      <div className="flex flex-col gap-24 lg:flex-row lg:items-start lg:gap-32">
        <div className="flex min-w-0 flex-1 flex-col gap-24">
          <CoherenceWarnings warnings={route.warnings} />
          <RoutePreview route={route} />
          <StepList steps={route.steps} />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-16 lg:w-decision">
          <CatalogRouteActions
            onUnpublish={isOnline ? () => handleOpen('unpublish') : undefined}
            onRepublish={
              isAdmin && route.status === 'unpublished' ? () => handleOpen('republish') : undefined
            }
            onReassign={isAdmin && route.author ? () => handleOpen('reassign') : undefined}
            isBusy={actions.isBusy}
          />
          {route.author ? <AuthorCard author={route.author} /> : null}
          <HistoryCard history={route.history} />
        </aside>
      </div>
      <RouteReasonDialog
        id="unpublish"
        texts={texts.unpublishDialog}
        isOpen={openDialog === 'unpublish'}
        reasonCode={reasonCode}
        onReasonCodeChange={setReasonCode}
        message={message}
        onMessageChange={setMessage}
        onCancel={() => setOpenDialog(null)}
        onConfirm={() =>
          isRejectionReason(reasonCode) && void actions.unpublish(reasonCode, message)
        }
        isBusy={actions.isBusy}
      />
      <RepublishDialog
        isOpen={openDialog === 'republish'}
        message={message}
        onMessageChange={setMessage}
        onCancel={() => setOpenDialog(null)}
        onConfirm={() => void actions.republish(message)}
        isBusy={actions.isBusy}
      />
      <ConfirmDialog
        isOpen={openDialog === 'reassign'}
        onCancel={() => setOpenDialog(null)}
        onConfirm={() => void actions.reassign()}
        title={texts.reassignDialog.title}
        description={texts.reassignDialog.description}
        cancelLabel={messages.confirm.cancel}
        closeLabel={messages.confirm.close}
        confirmLabel={texts.reassignDialog.confirm}
        confirmVariant="primary"
        isBusy={actions.isBusy}
      />
    </div>
  );
}
