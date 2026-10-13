'use client';

import { CatalogRoutesFilters } from '@/components/catalog/CatalogRoutesFilters';
import { CatalogRoutesTable } from '@/components/catalog/CatalogRoutesTable';
import { PageMessage } from '@/components/states/PageMessage';
import {
  accessFilterValues,
  catalogRoutesListOptions,
  statusFilterValues,
  toCatalogRoutesParams,
} from '@/config/catalog-routes-list';
import { sectionPaths } from '@/config/navigation';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useListQuery } from '@/hooks/useListQuery';
import { useRemoteData } from '@/hooks/useRemoteData';
import { useSession } from '@/hooks/useSession';
import { getSessionClients } from '@/lib/auth/clients';
import { serializeListQuery } from '@/lib/list-query';
import { messages } from '@/messages/fr';
import { Button, Pagination, SearchInput } from '@widoo/ui';
import { useRouter } from 'next/navigation';

const searchDelayMs = 300;
const texts = messages.catalog.routes;

/** Address of the sheet of a route of the catalog. */
export const catalogRoutePathOf = (routeId: string) =>
  `${sectionPaths.catalog}/parcours/${routeId}`;

const statusOptions = Object.entries(statusFilterValues).map(([value, status]) => ({
  value,
  label: messages.routeStatuses[status],
}));
const accessOptions = Object.entries(accessFilterValues).map(([value, access]) => ({
  value,
  label: texts.access[access],
}));

/**
 * A-04, the routes of the catalog: reads the page the address asks for, and writes the search,
 * the filters, the sort and the page back to the address.
 */
export function CatalogRoutesContainer() {
  const router = useRouter();
  const { session } = useSession();
  const { query, handleSearch, handleFilter, handleSort, handlePage } =
    useListQuery(catalogRoutesListOptions);
  const routes = useRemoteData(serializeListQuery(query, catalogRoutesListOptions), (signal) =>
    getSessionClients().api.getCatalogRoutes(toCatalogRoutesParams(query), signal),
  );
  const handleSearchTyped = useDebouncedCallback(handleSearch, searchDelayMs);

  const data = routes.status === 'ready' ? routes.data : undefined;
  // The sheet of a route is read by moderators and admins; an editor reads the list.
  const canOpenSheet = session.status === 'signedIn' && session.member.role !== 'editor';

  const renderList = () => {
    if (routes.status === 'error') {
      return (
        <PageMessage
          role="alert"
          title={messages.list.error}
          action={<Button onClick={routes.reload}>{messages.list.retry}</Button>}
        />
      );
    }
    if (data?.items.length === 0) {
      return <PageMessage title={texts.empty.title} text={texts.empty.text} />;
    }
    return (
      <CatalogRoutesTable
        items={data?.items ?? []}
        isLoading={routes.status === 'loading'}
        sort={query.sort}
        onSort={handleSort}
        onOpen={canOpenSheet ? (route) => router.push(catalogRoutePathOf(route.id)) : undefined}
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
      <CatalogRoutesFilters
        statuses={statusOptions}
        status={query.filters.statut ?? null}
        onStatusChange={(status) => handleFilter('statut', status ?? query.filters.statut ?? '')}
        accesses={accessOptions}
        access={query.filters.acces ?? null}
        onAccessChange={(access) => handleFilter('acces', access ?? query.filters.acces ?? '')}
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
