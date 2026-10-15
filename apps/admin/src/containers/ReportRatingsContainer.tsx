'use client';

import { RatingsTable } from '@/components/reports/RatingsTable';
import { PageMessage } from '@/components/states/PageMessage';
import { ratingsListOptions, ratingValues, toRatingsParams } from '@/config/ratings-list';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { Button, FilterMenu, Pagination } from '@widoo/ui';

const texts = messages.reports.ratings;

const ratingOptions = ratingValues.map((value) => ({
  value: String(value),
  label: texts.ratingOption(value),
}));

/**
 * A-03, the ratings with a comment, filtered by note. The ratings come with the rating of a route
 * at the end of an outing; until then the list is empty.
 */
export function ReportRatingsContainer() {
  const { query, handleFilter, handlePage } = useListQuery(ratingsListOptions);
  const ratings = useRemoteData(serializeListQuery(query, ratingsListOptions), (signal) =>
    getSessionClients().api.getAdminRatings(toRatingsParams(query), signal),
  );
  const data = ratings.status === 'ready' ? ratings.data : undefined;

  const renderList = () => {
    if (ratings.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={texts.error}
          action={<Button onClick={ratings.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return <RatingsTable items={data?.items ?? []} isLoading={ratings.status === 'loading'} />;
  };

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center gap-16">
        <div role="group" aria-label={texts.filters.label}>
          <FilterMenu
            label={texts.filters.rating}
            options={ratingOptions}
            value={query.filters.note ?? null}
            onChange={(note) => handleFilter('note', note ?? query.filters.note ?? '')}
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
