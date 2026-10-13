import { CatalogTabs } from '@/components/catalog/CatalogTabs';
import { CatalogPlacesContainer } from '@/containers/CatalogPlacesContainer';
import { Suspense } from 'react';

/** A-04, the places of the catalog. The state of the list is read from the address. */
export default function CatalogPlacesPage() {
  return (
    <div className="flex flex-col gap-16">
      <CatalogTabs current="places" />
      <Suspense>
        <CatalogPlacesContainer />
      </Suspense>
    </div>
  );
}
