'use client';

import { PageMessage } from '@/components/states/PageMessage';
import { SupportPanelContent } from '@/components/support/SupportPanelContent';
import { SupportStatusBadge } from '@/components/support/SupportStatusBadge';
import { SupportTable } from '@/components/support/SupportTable';
import { sectionPaths } from '@/config/navigation';
import { supportListOptions, toSupportParams } from '@/config/support-list';
import { useCardOnScreen } from '@/hooks/useCardOnScreen';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { adminSupportStatuses, type AdminSupportMessage } from '@widoo/shared';
import { Button, DetailPanel, DetailPanelSkeleton, FilterMenu, Pagination } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';

const texts = messages.support;
/** Parameter of the address that holds the message whose card is open next to the list. */
const openMessageParam = 'message';

const statusOptions = adminSupportStatuses.map((status) => ({
  value: status,
  label: texts.statuses[status],
}));

/**
 * A-13, the messages of « Nous écrire »: the list the address asks for, the ones to handle first,
 * and next to it the card of the message the address names.
 */
export function SupportContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openMessageParam);
  const { query, handleFilter, handlePage } = useListQuery(supportListOptions);
  const listAddress = serializeListQuery(query, supportListOptions);
  const messagesList = useRemoteData(listAddress, (signal) =>
    getSessionClients().api.getAdminSupport(toSupportParams(query), signal),
  );
  const card = useRemoteData(`card:${openId ?? ''}`, (signal) =>
    openId ? getSessionClients().api.getAdminSupportMessage(openId, signal) : Promise.resolve(null),
  );
  const { fresh: openMessage, isLoading: isCardLoading, stale } = useCardOnScreen(openId, card);
  const data = messagesList.status === 'ready' ? messagesList.data : undefined;

  /** The address of the list as it is, with the card of `messageId` open, or none. */
  const showMessage = (messageId: string | null) => {
    const params = new URLSearchParams(listAddress);
    if (messageId) {
      params.set(openMessageParam, messageId);
    }
    const address = params.toString();
    router.replace(address ? `${sectionPaths.support}?${address}` : sectionPaths.support, {
      scroll: false,
    });
  };

  const renderCard = (message: AdminSupportMessage) => (
    <DetailPanel
      key={message.id}
      title={messages.users.topics[message.topic]}
      status={<SupportStatusBadge isHandled={message.handledAt !== null} />}
      closeLabel={messages.confirm.close}
      onClose={() => showMessage(null)}
    >
      <SupportPanelContent
        message={message}
        accountPathOf={(userId) =>
          `${sectionPaths.users}?${new URLSearchParams({ compte: userId }).toString()}`
        }
      />
    </DetailPanel>
  );

  /** The card open next to the list: the fresh one, or the previous one while the next loads. */
  const renderPanel = () => {
    if (openMessage) {
      return renderCard(openMessage);
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

  const renderList = () => {
    if (messagesList.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={messagesList.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <SupportTable
        items={data?.items ?? []}
        isLoading={messagesList.status === 'loading'}
        openId={openId}
        onOpen={(message) => showMessage(message.id)}
      />
    );
  };

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
          <div role="group" aria-label={texts.filters.label}>
            <FilterMenu
              label={texts.filters.status}
              options={statusOptions}
              value={query.filters.statut ?? null}
              onChange={(status) => handleFilter('statut', status ?? query.filters.statut ?? '')}
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
      {renderPanel()}
    </div>
  );
}
