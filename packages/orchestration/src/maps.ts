/**
 * Google Maps of « Itinéraire » (Ecrans › E-07): the command opens Google Maps to the step to go
 * to, in the mode of the trip that leads to it (#510, D-052). One definition, shared by
 * `GET /v1/me/planned/:id/maps-url` and by the app when the network is down.
 */
import type { LatLng, Transport } from '@widoo/shared';

/** The travel mode of Google Maps: the value of `travelmode=`, never a display label. */
export type MapsTravelMode = 'walking' | 'bicycling' | 'transit' | 'driving';

/**
 * The travel mode of Google Maps for a trip in each transport: the `mappings.transitModes` table
 * of `packages/tokens/generated/tokens.json` (`walk` → `walking`, `bike` → `bicycling`, `metro` →
 * `transit`, `car` → `driving`), defined here because the tokens package does not export it.
 */
const travelModeOfTransport: Record<Transport, MapsTravelMode> = {
  walk: 'walking',
  bike: 'bicycling',
  metro: 'transit',
  car: 'driving',
};

/** The travel mode of Google Maps for a trip in this transport. */
export function travelModeOf(transport: Transport): MapsTravelMode {
  return travelModeOfTransport[transport];
}

/** A step as the URL needs it: where to go, and the trip from it to the next one. */
export interface MapsStep {
  place: { location: LatLng };
  /** The trip to the next step; null for the last one (`Step.transition`). */
  transition: { mode: Transport } | null;
}

/**
 * Google Maps to the step at this index of the snapshot, in the mode of the trip to it: no trip
 * leads to the first step, so Google Maps opens it on foot, and so again when the trip carries
 * no mode. One URL for one step, never for the whole route (D-032).
 */
export function stepMapsUrl(steps: readonly MapsStep[], index: number): string {
  const step = steps[index];
  if (!step) {
    throw new Error(`No step at index ${index}`);
  }
  const transition = index > 0 ? steps[index - 1]?.transition : null;
  const travelmode = transition ? travelModeOf(transition.mode) : 'walking';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${step.place.location.lat},${step.place.location.lng}`,
  )}&travelmode=${travelmode}`;
}
