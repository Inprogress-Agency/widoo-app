import { sectionPaths } from '@/config/navigation';
import { redirect } from 'next/navigation';

/** A-04 opens on its routes; the places join them under their own address. */
export default function CatalogPage() {
  redirect(`${sectionPaths.catalog}/parcours`);
}
