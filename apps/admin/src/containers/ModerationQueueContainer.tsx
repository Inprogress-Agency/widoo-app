'use client';

import {
  ModerationQueueFilters,
  type ModerationFilterChoice,
} from '@/components/moderation/ModerationQueueFilters';
import { ModerationQueueTable } from '@/components/moderation/ModerationQueueTable';
import { sheetPathOf } from '@/components/moderation/sheet/SheetNavigation';
import { PageMessage } from '@/components/states/PageMessage';
import {
  onFilterValue,
  moderationListOptions,
  toModerationQueueParams,
  type ModerationFilter,
  type StatusFilterValue,
} from '@/config/moderation-list';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { isWaitingLate } from '@/lib/dates';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import type { ModerationQueueItem } from '@widoo/shared';
import { Button, Pagination, SearchInput } from '@widoo/ui';
import { useRouter } from 'next/navigation';

const searchDelayMs = 300;

/** The filter of the address and its value behind each chip. */
const filterOfChoice: Record<ModerationFilterChoice, [ModerationFilter, string]> = {
  pending: ['statut', 'relecture' satisfies StatusFilterValue],
  changesRequested: ['statut', 'modifications' satisfies StatusFilterValue],
  late: ['retard', onFilterValue],
  revisions: ['revision', onFilterValue],
};

const isLate = (item: ModerationQueueItem) => isWaitingLate(new Date(item.waitingSince));

/**
 * A-02, the moderation queue: reads the page the address asks for, and writes the search, the
 * filters, the sort and the page back to the address.
 */
export function ModerationQueueContainer() {
  const router = useRouter();
  const { query, handleSearch, handleFilter, handleSort, handlePage } =
    useListQuery(moderationListOptions);
  const queue = useRemoteData(serializeListQuery(query, moderationListOptions), (signal) =>
    getSessionClients().api.getModerationQueue(toModerationQueueParams(query), signal),
  );
  const handleSearchTyped = useDebouncedCallback(handleSearch, searchDelayMs);

  const texts = messages.moderation;
  const data = queue.status === 'ready' ? queue.data : undefined;
  const isFiltered = query.search !== '' || Object.keys(query.filters).length > 0;
  const active = {
    pending: query.filters.statut === 'relecture',
    changesRequested: query.filters.statut === 'modifications',
    late: query.filters.retard === onFilterValue,
    revisions: query.filters.revision === onFilterValue,
  };

  const renderList = () => {
    if (queue.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={messages.list.error}
          action={<Button onClick={queue.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return isFiltered ? (
        <PageMessage title={texts.empty.filteredTitle} text={texts.empty.filteredText} />
      ) : (
        <PageMessage title={texts.empty.title} text={texts.empty.text} />
      );
    }
    return (
      <ModerationQueueTable
        items={data?.items ?? []}
        isLoading={queue.status === 'loading'}
        sort={query.sort}
        onSort={handleSort}
        isLate={isLate}
        onOpen={(item) => router.push(sheetPathOf(item.id))}
      />
    );
  };

  return (
    <div className="flex flex-col gap-16">
      <div className="flex items-center justify-between gap-16">
        <SearchInput
          aria-label={texts.search}
          placeholder={texts.search}
          defaultValue={query.search}
          onChange={(event) => handleSearchTyped(event.target.value)}
          className="w-full max-w-card-list-w"
        />
        {data ? (
          <p className="text-body-s text-muted-foreground">{texts.total(data.total)}</p>
        ) : null}
      </div>
      <ModerationQueueFilters
        counts={data?.counts}
        active={active}
        onToggle={(choice) => handleFilter(...filterOfChoice[choice])}
        cities={(data?.cities ?? []).map((city) => ({ value: city.id, label: city.name }))}
        cityId={query.filters.ville ?? null}
        onCityChange={(cityId) => handleFilter('ville', cityId ?? query.filters.ville ?? '')}
      />
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
  );
}
