'use client';

import { ReasonDialog } from '@/components/reports/ReasonDialog';
import { RatingsTable } from '@/components/reports/RatingsTable';
import { PageMessage } from '@/components/states/PageMessage';
import { ratingsListOptions, ratingValues, toRatingsParams } from '@/config/ratings-list';
import { useListQuery } from '@/hooks/useListQuery';
import { useRatingActions } from '@/hooks/useRatingActions';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import type { AdminRating } from '@widoo/shared';
import { Button, FilterMenu, Pagination, type FilterMenuOption } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.reports.ratings;

const ratingOptions = ratingValues.map((value) => ({
  value: String(value),
  label: texts.ratingOption(value),
}));

/**
 * A-03, the ratings with a comment, filtered by note: the latest first, and for each one
 * « Masquer » (with a reason) or, once masked, « Rétablir ».
 */
export function ReportRatingsContainer() {
  const { query, handleFilter, handlePage } = useListQuery(ratingsListOptions);
  const ratings = useRemoteData(serializeListQuery(query, ratingsListOptions), (signal) =>
    getSessionClients().api.getAdminRatings(toRatingsParams(query), signal),
  );
  const data = ratings.status === 'ready' ? ratings.data : undefined;
  // The menu keeps its choices while the next page of the list loads: they are taken again
  // from each answer, during the render that receives it.
  const [known, setKnown] = useState<{ source: unknown; choices: FilterMenuOption[] }>({
    source: null,
    choices: [],
  });
  if (data && data.routes !== known.source) {
    setKnown({
      source: data.routes,
      choices: data.routes.map((route) => ({ value: route.id, label: route.title })),
    });
  }
  const [hiding, setHiding] = useState<AdminRating | null>(null);
  const [reason, setReason] = useState('');
  const reload = ratings.status === 'loading' ? undefined : ratings.reload;
  const actions = useRatingActions(() => {
    setHiding(null);
    reload?.();
  });

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
    return (
      <RatingsTable
        items={data?.items ?? []}
        isLoading={ratings.status === 'loading'}
        onHide={(rating) => {
          setReason('');
          setHiding(rating);
        }}
        onUnhide={(rating) => void actions.unhide(rating.id)}
        isBusy={actions.isBusy}
      />
    );
  };

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center gap-16">
        <div role="group" aria-label={texts.filters.label} className="flex flex-wrap gap-8">
          <FilterMenu
            label={texts.filters.rating}
            options={ratingOptions}
            value={query.filters.note ?? null}
            onChange={(note) => handleFilter('note', note ?? query.filters.note ?? '')}
          />
          <FilterMenu
            label={texts.filters.route}
            options={known.choices}
            value={query.filters.parcours ?? null}
            onChange={(route) => handleFilter('parcours', route ?? query.filters.parcours ?? '')}
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
      <ReasonDialog
        isOpen={hiding !== null}
        dialog={texts.hideDialog}
        field={texts.hideDialog}
        fieldId="hide-rating-reason"
        reason={reason}
        onReasonChange={setReason}
        onCancel={() => setHiding(null)}
        onConfirm={() => hiding && void actions.hide(hiding.id, reason)}
        isBusy={actions.isBusy}
      />
    </div>
  );
}
