import { ModerationSheetContainer } from '@/containers/ModerationSheetContainer';

/** A-02, the moderation sheet of a route, on its own page. */
export default async function ModerationSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModerationSheetContainer key={id} routeId={id} />;
}
