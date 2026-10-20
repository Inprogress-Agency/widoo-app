'use client';

import { PartnerActions } from '@/components/b2b/PartnerActions';
import { PartnerPanelContent } from '@/components/b2b/PartnerPanelContent';
import { PartnersTable } from '@/components/b2b/PartnersTable';
import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { catalogRoutePathOf } from '@/containers/CatalogRoutesContainer';
import { PartnerFormContainer } from '@/containers/PartnerFormContainer';
import { PartnerRoutesContainer } from '@/containers/PartnerRoutesContainer';
import { useCardOnScreen } from '@/hooks/useCardOnScreen';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import type { B2bClient } from '@widoo/shared';
import { Button, DetailPanel, DetailPanelSkeleton } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const texts = messages.b2b;
/** Parameter of the address that holds the partner whose card is open next to the list. */
const openPartnerParam = 'partenaire';

/** A-10, the B2B partners: the list, and next to it the card of the one the address names. */
export function PartnersContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openPartnerParam);
  const partners = useRemoteData('partners', (signal) =>
    getSessionClients().api.getB2bClients(signal),
  );
  const card = useRemoteData(`card:${openId ?? ''}`, (signal) =>
    openId ? getSessionClients().api.getB2bClient(openId, signal) : Promise.resolve(null),
  );
  const { fresh: openPartner, isLoading: isCardLoading, stale } = useCardOnScreen(openId, card);
  const items = partners.status === 'ready' ? partners.data.items : undefined;
  const [dialog, setDialog] = useState<'create' | 'edit' | 'routes' | null>(null);

  const showPartner = (partnerId: string | null) =>
    router.replace(
      partnerId
        ? `${sectionPaths.b2bClients}?${new URLSearchParams({ [openPartnerParam]: partnerId }).toString()}`
        : sectionPaths.b2bClients,
      { scroll: false },
    );

  const handleSaved = (saved: B2bClient) => {
    if (partners.status !== 'loading') partners.reload();
    if (saved.id === openId) {
      if (card.status !== 'loading') card.reload();
    } else {
      showPartner(saved.id);
    }
  };

  const renderCard = (partner: B2bClient) => (
    <DetailPanel
      key={partner.id}
      title={partner.name}
      closeLabel={messages.confirm.close}
      onClose={() => showPartner(null)}
      actions={
        <PartnerActions
          onEdit={() => setDialog('edit')}
          onChooseRoutes={() => setDialog('routes')}
        />
      }
    >
      <PartnerPanelContent partner={partner} routePathOf={catalogRoutePathOf} />
    </DetailPanel>
  );

  /** The card open next to the list: the fresh one, or the previous one while the next loads. */
  const renderPanel = () => {
    if (openPartner) {
      return renderCard(openPartner);
    }
    if (!isCardLoading) {
      return null;
    }
    return stale ? (
      <div inert className="contents">
        {renderCard(stale)}
      </div>
    ) : (
      <DetailPanelSkeleton label={texts.panel.loading} />
    );
  };

  if (partners.status === 'error') {
    return (
      <PageMessage
        role="alert"
        title={texts.error}
        action={<Button onClick={partners.reload}>{messages.list.retry}</Button>}
      />
    );
  }

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
          <Button onClick={() => setDialog('create')}>{texts.add}</Button>
          {items ? (
            <p className="text-body-s text-muted-foreground">{texts.total(items.length)}</p>
          ) : null}
        </div>
        {items?.length === 0 ? (
          <PageMessage title={texts.empty.title} text={texts.empty.text} />
        ) : (
          <PartnersTable
            items={items ?? []}
            isLoading={partners.status === 'loading'}
            openId={openId}
            onOpen={(partner) => showPartner(partner.id)}
          />
        )}
      </div>
      {renderPanel()}
      {dialog === 'routes' && openPartner ? (
        <PartnerRoutesContainer
          partner={openPartner}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}
      {dialog === 'create' || dialog === 'edit' ? (
        <PartnerFormContainer
          partner={dialog === 'edit' ? openPartner : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
