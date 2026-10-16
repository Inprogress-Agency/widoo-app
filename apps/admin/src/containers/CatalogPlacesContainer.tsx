'use client';

import { CatalogPlacesFilters } from '@/components/catalog/CatalogPlacesFilters';
import { CatalogPlacesTable } from '@/components/catalog/CatalogPlacesTable';
import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { PageMessage } from '@/components/states/PageMessage';
import {
  catalogPlacesListOptions,
  placeStatusFilterValues,
  toCatalogPlacesParams,
} from '@/config/catalog-places-list';
import { PlacePanelContainer } from '@/containers/PlacePanelContainer';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useListQuery } from '@/hooks/useListQuery';
import { useCanWriteCatalog } from '@/hooks/useCanWriteCatalog';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { PlusIcon, UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr';
import { labels, taxonomies } from '@widoo/shared';
import { Button, Pagination, SearchInput } from '@widoo/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const searchDelayMs = 300;
const texts = messages.catalog.places;
/** Parameter of the address that holds the place whose sheet is open next to the list. */
const openPlaceParam = 'lieu';

const categoryOptions = taxonomies.placeCategories.map((category) => ({
  value: category,
  label: labels.fr.placeCategories[category],
}));
const statusOptions = Object.entries(placeStatusFilterValues).map(([value, status]) => ({
  value,
  label: labels.fr.verificationStatuses[status],
}));

/**
 * A-04, the places of the catalog: the list the address asks for, and next to it the sheet of
 * the place the address names. Editors and admins create and edit; a moderator reads.
 */
export function CatalogPlacesContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openPlaceParam);
  const canWrite = useCanWriteCatalog();
  const isAdmin = useIsAdmin();
  const { query, handleSearch, handleFilter, handleSort, handlePage } =
    useListQuery(catalogPlacesListOptions);
  const listAddress = serializeListQuery(query, catalogPlacesListOptions);
  const places = useRemoteData(listAddress, (signal) =>
    getSessionClients().api.getCatalogPlaces(toCatalogPlacesParams(query), signal),
  );
  const handleSearchTyped = useDebouncedCallback(handleSearch, searchDelayMs);

  const data = places.status === 'ready' ? places.data : undefined;
  /** The address of the list as it is, with the sheet of `placeId` open, or none. */
  const showPlace = (placeId: string | null) => {
    const params = new URLSearchParams(listAddress);
    if (placeId) {
      params.set(openPlaceParam, placeId);
    }
    const address = params.toString();
    router.replace(address ? `${catalogPaths.places}?${address}` : catalogPaths.places, {
      scroll: false,
    });
  };

  const renderList = () => {
    if (places.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={messages.list.error}
          action={<Button onClick={places.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <CatalogPlacesTable
        items={data?.items ?? []}
        isLoading={places.status === 'loading'}
        sort={query.sort}
        onSort={handleSort}
        openId={openId}
        onOpen={(place) => showPlace(place.id)}
      />
    );
  };

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
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
          <div className="ml-auto flex flex-wrap gap-12">
            {isAdmin ? (
              <Button asChild variant="outline">
                <Link href={`${catalogPaths.places}/import`}>
                  <UploadSimpleIcon aria-hidden className="size-18" />
                  {texts.import.open}
                </Link>
              </Button>
            ) : null}
            {canWrite ? (
              <Button asChild>
                <Link href={`${catalogPaths.places}/nouveau`}>
                  <PlusIcon aria-hidden className="size-18" />
                  {texts.create}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <CatalogPlacesFilters
          categories={categoryOptions}
          category={query.filters.categorie ?? null}
          onCategoryChange={(category) =>
            handleFilter('categorie', category ?? query.filters.categorie ?? '')
          }
          statuses={statusOptions}
          status={query.filters.statut ?? null}
          onStatusChange={(status) => handleFilter('statut', status ?? query.filters.statut ?? '')}
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
      {openId ? (
        <PlacePanelContainer
          key={openId}
          placeId={openId}
          fallbackTitle={data?.items.find((place) => place.id === openId)?.name ?? ''}
          editPath={canWrite ? `${catalogPaths.places}/${openId}` : undefined}
          onClose={() => showPlace(null)}
        />
      ) : null}
    </div>
  );
}
