import { CatalogTabs } from '@/components/catalog/CatalogTabs';
import { CatalogRoutesContainer } from '@/containers/CatalogRoutesContainer';
import { Suspense } from 'react';

/** A-04, the routes of the catalog. The state of the list is read from the address. */
export default function CatalogRoutesPage() {
  return (
    <div className="flex flex-col gap-16">
      <CatalogTabs current="routes" />
      <Suspense>
        <CatalogRoutesContainer />
      </Suspense>
    </div>
  );
}
