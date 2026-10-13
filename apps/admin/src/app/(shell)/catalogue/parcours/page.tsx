import { CatalogRoutesContainer } from '@/containers/CatalogRoutesContainer';
import { Suspense } from 'react';

/** A-04, the routes of the catalog. The state of the list is read from the address. */
export default function CatalogRoutesPage() {
  return (
    <Suspense>
      <CatalogRoutesContainer />
    </Suspense>
  );
}
