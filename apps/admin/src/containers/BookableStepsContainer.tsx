'use client';

import { BookableStepsTable } from '@/components/affiliation/BookableStepsTable';
import { PageMessage } from '@/components/states/PageMessage';
import {
  bookableStepsListOptions,
  toBookableStepsParams,
  withoutPartnerValue,
} from '@/config/bookable-steps-list';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { Button, FilterChip, Pagination } from '@widoo/ui';

const texts = messages.affiliation.steps;

/**
 * A-09, the steps that can be booked: the link each one shows, where it comes from and its clicks
 * of the last 30 days. « Lieux sans lien partenaire » keeps the places to sign up for first.
 */
export function BookableStepsContainer() {
  const { query, handleFilter, handlePage } = useListQuery(bookableStepsListOptions);
  const listAddress = serializeListQuery(query, bookableStepsListOptions);
  const steps = useRemoteData(listAddress, (signal) =>
    getSessionClients().api.getBookableSteps(toBookableStepsParams(query), signal),
  );
  const data = steps.status === 'ready' ? steps.data : undefined;

  const renderList = () => {
    if (steps.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={steps.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return <BookableStepsTable items={data?.items ?? []} isLoading={steps.status === 'loading'} />;
  };

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center gap-16">
        <div role="group" aria-label={texts.filters.label}>
          <FilterChip
            label={texts.filters.withoutPartner}
            isActive={query.filters['sans-partenaire'] === withoutPartnerValue}
            onClick={() => handleFilter('sans-partenaire', withoutPartnerValue)}
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
  );
}
