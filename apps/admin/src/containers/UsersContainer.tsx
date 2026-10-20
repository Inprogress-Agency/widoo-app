'use client';

import { PageMessage } from '@/components/states/PageMessage';
import { UserPanelContent } from '@/components/users/UserPanelContent';
import { UserRoleBadge } from '@/components/users/UserRoleBadge';
import { UsersTable } from '@/components/users/UsersTable';
import { toUsersParams, usersListOptions } from '@/config/users-list';
import { catalogRoutePathOf } from '@/containers/CatalogRoutesContainer';
import { UserDecisionsContainer } from '@/containers/UserDecisionsContainer';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useCardOnScreen } from '@/hooks/useCardOnScreen';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { sectionPaths } from '@/config/navigation';
import { userNameOf } from '@/lib/user-display';
import { messages } from '@/messages/fr';
import type { AdminUserDetail } from '@widoo/shared';
import { Button, DetailPanel, DetailPanelSkeleton, Pagination, SearchInput } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';

const texts = messages.users;
const searchDelayMs = 300;
/** Parameter of the address that holds the account whose card is open next to the list. */
const openUserParam = 'compte';

/**
 * A-06, the accounts: the list the address asks for, searched by e-mail, first name or
 * identifier, and next to it the card of the account the address names, with its actions.
 */
export function UsersContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openUserParam);
  const { query, handleSearch, handlePage } = useListQuery(usersListOptions);
  const handleSearchTyped = useDebouncedCallback(handleSearch, searchDelayMs);
  const listAddress = serializeListQuery(query, usersListOptions);
  const users = useRemoteData(listAddress, (signal) =>
    getSessionClients().api.getAdminUsers(toUsersParams(query), signal),
  );
  const card = useRemoteData(`card:${openId ?? ''}`, (signal) =>
    openId ? getSessionClients().api.getAdminUser(openId, signal) : Promise.resolve(null),
  );
  const data = users.status === 'ready' ? users.data : undefined;
  const {
    fresh: openUser,
    isLoading: isCardLoading,
    stale: staleUser,
  } = useCardOnScreen(openId, card);

  /** The address of the list as it is, with the card of `userId` open, or none. */
  const showUser = (userId: string | null) => {
    const params = new URLSearchParams(listAddress);
    if (userId) {
      params.set(openUserParam, userId);
    }
    const address = params.toString();
    router.replace(address ? `${sectionPaths.users}?${address}` : sectionPaths.users, {
      scroll: false,
    });
  };
  const reloadAll = () => {
    if (users.status !== 'loading') users.reload();
    if (card.status !== 'loading') card.reload();
  };

  const renderList = () => {
    if (users.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={users.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <UsersTable
        items={data?.items ?? []}
        isLoading={users.status === 'loading'}
        openId={openId}
        onOpen={(user) => showUser(user.id)}
      />
    );
  };

  /** The card open next to the list: the fresh one, or the previous one while the next loads. */
  const renderPanel = () => {
    if (openUser) {
      return renderCard(openUser);
    }
    if (!isCardLoading) {
      return null;
    }
    return staleUser ? (
      <div inert className="contents">
        {renderCard(staleUser)}
      </div>
    ) : (
      <DetailPanelSkeleton label={texts.panel.loading} />
    );
  };

  const renderCard = (user: AdminUserDetail) => (
    <DetailPanel
      key={user.id}
      title={userNameOf(user)}
      status={<UserRoleBadge role={user.role} />}
      closeLabel={messages.confirm.close}
      onClose={() => showUser(null)}
      actions={
        <UserDecisionsContainer
          user={user}
          onSettled={reloadAll}
          onDeleted={() => {
            showUser(null);
            if (users.status !== 'loading') users.reload();
          }}
        />
      }
    >
      <UserPanelContent user={user} routePathOf={catalogRoutePathOf} />
    </DetailPanel>
  );

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
          <SearchInput
            aria-label={texts.search}
            placeholder={texts.search}
            defaultValue={query.search}
            onChange={(event) => handleSearchTyped(event.target.value)}
          />
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
