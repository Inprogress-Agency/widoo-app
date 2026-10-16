import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { redirect } from 'next/navigation';

/** A-04 opens on its places; its routes are the second tab. */
export default function CatalogPage() {
  redirect(catalogPaths.places);
}
