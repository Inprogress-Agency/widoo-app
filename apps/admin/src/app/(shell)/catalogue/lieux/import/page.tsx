import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { AdminOnlyGate } from '@/containers/AdminOnlyGate';
import { PlaceImportContainer } from '@/containers/PlaceImportContainer';
import { messages } from '@/messages/fr';

/** A-04, the import of places from a CSV file. Admins only. */
export default function PlaceImportPage() {
  return (
    <AdminOnlyGate backHref={catalogPaths.places} backLabel={messages.catalog.places.form.back}>
      <PlaceImportContainer />
    </AdminOnlyGate>
  );
}
