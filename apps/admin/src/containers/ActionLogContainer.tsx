'use client';

import { ActionPanelContent } from '@/components/actions/ActionPanelContent';
import { ActionsTable } from '@/components/actions/ActionsTable';
import { PageMessage } from '@/components/states/PageMessage';
import { actionsListOptions, periodFilterValues, toActionsParams } from '@/config/actions-list';
import { sectionPaths } from '@/config/navigation';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { actionLabelOf, targetTypeLabelOf } from '@/lib/action-display';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { Button, DetailPanel, FilterMenu, Pagination } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';

const texts = messages.actionLog;
/** Parameter of the address that holds the line whose detail is open next to the list. */
const openActionParam = 'ligne';

const periodOptions = Object.keys(periodFilterValues).map((value) => ({
  value,
  label: texts.periods[value as keyof typeof texts.periods],
}));

/**
 * A-12, the journal of the admin: the lines the address asks for, filtered by author, action,
 * target and period, and next to it the detail of the line the address names. Read only.
 */
export function ActionLogContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openActionParam);
  const { query, handleFilter, handlePage } = useListQuery(actionsListOptions);
  const listAddress = serializeListQuery(query, actionsListOptions);
  const actions = useRemoteData(listAddress, (signal) =>
    getSessionClients().api.getAdminActions(toActionsParams(query), signal),
  );
  const filters = useRemoteData('filters', (signal) =>
    getSessionClients().api.getAdminActionFilters(signal),
  );
  const data = actions.status === 'ready' ? actions.data : undefined;
  const filterValues = filters.status === 'ready' ? filters.data : undefined;
  const openAction = data?.items.find((action) => action.id === openId);

  /** The address of the list as it is, with the detail of `actionId` open, or none. */
  const showAction = (actionId: string | null) => {
    const params = new URLSearchParams(listAddress);
    if (actionId) {
      params.set(openActionParam, actionId);
    }
    const address = params.toString();
    router.replace(address ? `${sectionPaths.actionLog}?${address}` : sectionPaths.actionLog, {
      scroll: false,
    });
  };
  const filterChange =
    (filter: 'auteur' | 'action' | 'cible' | 'periode') => (value: string | null) =>
      handleFilter(filter, value ?? query.filters[filter] ?? '');

  const renderList = () => {
    if (actions.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={actions.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <ActionsTable
        items={data?.items ?? []}
        isLoading={actions.status === 'loading'}
        openId={openId}
        onOpen={(action) => showAction(action.id)}
      />
    );
  };

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
          <div role="group" aria-label={texts.filters.label} className="flex flex-wrap gap-8">
            <FilterMenu
              label={texts.filters.actor}
              options={(filterValues?.actors ?? []).map((actor) => ({
                value: actor.id,
                label: actor.name ?? texts.unknownActor,
              }))}
              value={query.filters.auteur ?? null}
              onChange={filterChange('auteur')}
            />
            <FilterMenu
              label={texts.filters.action}
              options={(filterValues?.actions ?? []).map((action) => ({
                value: action,
                label: actionLabelOf(action),
              }))}
              value={query.filters.action ?? null}
              onChange={filterChange('action')}
            />
            <FilterMenu
              label={texts.filters.target}
              options={(filterValues?.targetTypes ?? []).map((targetType) => ({
                value: targetType,
                label: targetTypeLabelOf(targetType),
              }))}
              value={query.filters.cible ?? null}
              onChange={filterChange('cible')}
            />
            <FilterMenu
              label={texts.filters.period}
              options={periodOptions}
              value={query.filters.periode ?? null}
              onChange={filterChange('periode')}
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
      {openAction ? (
        <DetailPanel
          key={openAction.id}
          title={actionLabelOf(openAction.action)}
          closeLabel={messages.confirm.close}
          onClose={() => showAction(null)}
        >
          <ActionPanelContent action={openAction} />
        </DetailPanel>
      ) : null}
    </div>
  );
}
