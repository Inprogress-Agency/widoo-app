import { usePositionMap } from '@/hooks/usePositionMap';
import { messages } from '@/messages/fr';
import type { LatLng } from '@widoo/shared';
import 'mapbox-gl/dist/mapbox-gl.css';

const texts = messages.catalog.places.form;

type PlacePositionMapProps = {
  /** Public token of Mapbox. */
  token: string;
  /** Where the pin stands; null while no position can be read. */
  position: LatLng | null;
  /** The pin was moved to this position. */
  onMove: (position: LatLng) => void;
};

/**
 * The position of a place on a map, with a pin to move (A-04). The latitude and longitude
 * fields above it say the same and stay the way to set the position from the keyboard.
 */
export function PlacePositionMap({ token, position, onMove }: PlacePositionMapProps) {
  const { container, status } = usePositionMap({ token, position, onMove });
  return (
    <div className="flex flex-col gap-8">
      <div
        ref={container}
        role="group"
        aria-label={texts.map}
        className="h-map w-full overflow-hidden rounded-photo border border-border"
      />
      <p role="status" className="text-label text-muted-foreground">
        {status === 'failed' ? texts.mapFailed : texts.mapHint}
      </p>
    </div>
  );
}
