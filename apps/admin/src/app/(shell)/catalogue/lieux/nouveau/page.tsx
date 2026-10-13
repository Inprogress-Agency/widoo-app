import { PlaceFormContainer } from '@/containers/PlaceFormContainer';
import { PlaceWriteGate } from '@/containers/PlaceWriteGate';

/** A-04, a new place created by hand. Editors and admins only. */
export default function NewPlacePage() {
  return (
    <PlaceWriteGate>
      <PlaceFormContainer place={null} />
    </PlaceWriteGate>
  );
}
