import type { LatLng, RouteCard } from '@widoo/shared';
import { distanceBetweenM } from '../map/geo';

/**
 * Name of the zone around the user, for « 24 parcours · République »: the neighbourhood of the
 * start nearest to the user, or its arrondissement; null when no route names its place. No
 * geocoding: the position never leaves the device.
 */
export function zoneName(routes: readonly RouteCard[], position: LatLng): string | null {
  let nearest: { name: string; meters: number } | null = null;
  for (const route of routes) {
    const start = route.steps[0];
    const name = route.neighborhood ?? route.district;
    if (!start || !name) {
      continue;
    }
    const meters = distanceBetweenM(position, start.location);
    if (!nearest || meters < nearest.meters) {
      nearest = { name, meters };
    }
  }
  return nearest?.name ?? null;
}
