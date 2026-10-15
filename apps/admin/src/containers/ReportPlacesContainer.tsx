'use client';

import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { ClosePlaceDialog } from '@/components/reports/ClosePlaceDialog';
import { SignaledPlacesTable } from '@/components/reports/SignaledPlacesTable';
import { PageMessage } from '@/components/states/PageMessage';
import { useCanWriteCatalog } from '@/hooks/useCanWriteCatalog';
import { usePlaceSignalActions } from '@/hooks/usePlaceSignalActions';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import type { AdminSignaledPlace } from '@widoo/shared';
import { Button, Pagination } from '@widoo/ui';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

const texts = messages.reports.places;
const pageParam = 'page';

/**
 * A-03, the places the community flagged: the list, and for each place « Marquer vérifié »,
 * « Corriger le lieu » (the form of A-04, for a role that edits the catalog) and « Fermer le lieu ».
 */
export function ReportPlacesContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const cursor = useSearchParams().get(pageParam);
  const canEdit = useCanWriteCatalog();
  const places = useRemoteData(cursor ?? '', (signal) =>
    getSessionClients().api.getAdminSignals({ cursor: cursor ?? undefined }, signal),
  );
  const [closing, setClosing] = useState<AdminSignaledPlace | null>(null);
  const [reason, setReason] = useState('');
  const reload = places.status === 'loading' ? undefined : places.reload;
  const actions = usePlaceSignalActions(() => {
    setClosing(null);
    reload?.();
  });

  const data = places.status === 'ready' ? places.data : undefined;
  const handlePage = (next: string | null) =>
    router.replace(next ? `${pathname}?${pageParam}=${next}` : pathname, { scroll: false });

  const renderList = () => {
    if (places.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={places.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <SignaledPlacesTable
        items={data?.items ?? []}
        isLoading={places.status === 'loading'}
        editPathOf={canEdit ? (placeId) => `${catalogPaths.places}/${placeId}` : undefined}
        onVerify={(place) => void actions.verify(place.id)}
        onClose={(place) => {
          setReason('');
          setClosing(place);
        }}
        isBusy={actions.isBusy}
      />
    );
  };

  return (
    <div className="flex flex-col gap-16">
      {data ? <p className="text-body-s text-muted-foreground">{texts.total(data.total)}</p> : null}
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
      <ClosePlaceDialog
        isOpen={closing !== null}
        routeCount={closing?.routes.length ?? 0}
        reason={reason}
        onReasonChange={setReason}
        onCancel={() => setClosing(null)}
        onConfirm={() => closing && void actions.close(closing.id, reason)}
        isBusy={actions.isBusy}
      />
    </div>
  );
}
