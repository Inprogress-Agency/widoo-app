import type { LatLng } from './schemas/common';
import type { GeoBox } from './schemas/geocode';

/**
 * A zone chosen in the search is framed over about 3 km at least (Filtres-et-Recherche ›
 * Recherche textuelle, Ecrans › E-02), the span the home map opens on.
 */
export const zoneMinSpanM = 3000;

/** Meters in a degree of latitude, on the mean Earth radius. */
const metersPerDegree = 111_195;

/**
 * The zone the app frames and searches once a zone is chosen, and which its count is made on:
 * its envelope, each side widened around the centre to `zoneMinSpanM` when shorter. A station,
 * a point without envelope, gets the 3 km around it.
 */
export function zoneSearchBox(center: LatLng, envelope: GeoBox | null): GeoBox {
  const halfLat = zoneMinSpanM / 2 / metersPerDegree;
  const halfLng = halfLat / Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
  const around = {
    west: Math.max(-180, center.lng - halfLng),
    south: Math.max(-90, center.lat - halfLat),
    east: Math.min(180, center.lng + halfLng),
    north: Math.min(90, center.lat + halfLat),
  };
  if (!envelope) {
    return around;
  }
  return {
    west: Math.min(envelope.west, around.west),
    south: Math.min(envelope.south, around.south),
    east: Math.max(envelope.east, around.east),
    north: Math.max(envelope.north, around.north),
  };
}
