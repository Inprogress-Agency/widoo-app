'use client';

import { PlaceDetailContent } from '@/components/catalog/PlaceDetailContent';
import { VerificationBadge } from '@/components/catalog/VerificationBadge';
import { PageMessage } from '@/components/states/PageMessage';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { Button, DetailPanel } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.catalog.places.panel;

type PlacePanelContainerProps = {
  placeId: string;
  /** Name shown while the sheet loads, from the row that was opened. */
  fallbackTitle: string;
  /** Address of the form of this place; absent for a role that only reads the places. */
  editPath?: string;
  onClose: () => void;
};

/** The sheet of a place in the detail panel, next to the list (A-04). */
export function PlacePanelContainer({
  placeId,
  fallbackTitle,
  editPath,
  onClose,
}: PlacePanelContainerProps) {
  const place = useRemoteData(placeId, (signal) =>
    getSessionClients().api.getCatalogPlace(placeId, signal),
  );
  const data = place.status === 'ready' ? place.data : undefined;

  return (
    <DetailPanel
      title={data?.name ?? fallbackTitle}
      status={data ? <VerificationBadge status={data.verificationStatus} /> : undefined}
      closeLabel={messages.confirm.close}
      onClose={onClose}
      actions={
        data && editPath ? (
          <Button asChild>
            <Link href={editPath}>{texts.edit}</Link>
          </Button>
        ) : undefined
      }
    >
      {place.status === 'loading' ? (
        <PageMessage role="status" title={messages.shell.loading} />
      ) : null}
      {place.status === 'error' ? (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={place.reload}>{messages.list.retry}</Button>}
        />
      ) : null}
      {data ? <PlaceDetailContent place={data} /> : null}
    </DetailPanel>
  );
}
