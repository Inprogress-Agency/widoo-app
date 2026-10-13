import type { LatLng, Transport } from '@widoo/shared';

/** Travel modes of the Google Maps URLs; the metro is « transit ». */
const travelModes: Record<Transport, string> = {
  walk: 'walking',
  bike: 'bicycling',
  metro: 'transit',
  car: 'driving',
};

const point = ({ lat, lng }: LatLng) => `${lat},${lng}`;

/**
 * « C'est parti » until the route under way (E-07, v0.4): Google Maps from where the user is,
 * through every step, to the last one, without any tracking by the app. The position of the user
 * is never in the URL: Google Maps takes it itself. Null without a step.
 */
export function googleMapsUrl(steps: readonly LatLng[], transport: Transport): string | null {
  const last = steps.at(-1);
  if (!last) {
    return null;
  }
  const query = new URLSearchParams({
    api: '1',
    destination: point(last),
    travelmode: travelModes[transport],
  });
  const waypoints = steps.slice(0, -1).map(point);
  if (waypoints.length > 0) {
    query.set('waypoints', waypoints.join('|'));
  }
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}
