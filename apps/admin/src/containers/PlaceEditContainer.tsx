'use client';

import { PageMessage } from '@/components/states/PageMessage';
import { PlaceFormContainer } from '@/containers/PlaceFormContainer';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';

/** Reads the sheet of a place, then hands it to its form. */
export function PlaceEditContainer({ placeId }: { placeId: string }) {
  const place = useRemoteData(placeId, (signal) =>
    getSessionClients().api.getCatalogPlace(placeId, signal),
  );
  if (place.status === 'loading') {
    return <PageMessage role="status" title={messages.shell.loading} />;
  }
  if (place.status === 'error') {
    return (
      <PageMessage
        role="alert"
        title={messages.catalog.places.panel.error}
        action={<Button onClick={place.reload}>{messages.list.retry}</Button>}
      />
    );
  }
  return <PlaceFormContainer place={place.data} />;
}
