import { CatalogRouteSheetContainer } from '@/containers/CatalogRouteSheetContainer';

/** A-04, the sheet of a route of the catalog, on its own page. */
export default async function CatalogRouteSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CatalogRouteSheetContainer key={id} routeId={id} />;
}
