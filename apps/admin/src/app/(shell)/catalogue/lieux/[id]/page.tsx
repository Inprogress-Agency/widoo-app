import { PlaceEditContainer } from '@/containers/PlaceEditContainer';
import { PlaceWriteGate } from '@/containers/PlaceWriteGate';

/** A-04, the sheet of a place as a form. Editors and admins only. */
export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlaceWriteGate>
      <PlaceEditContainer key={id} placeId={id} />
    </PlaceWriteGate>
  );
}
