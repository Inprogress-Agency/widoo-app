import type { LatLng } from '@widoo/shared';

const earthRadiusM = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distance in a straight line between two points (haversine), in meters. */
export function straightLineM(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Decimals kept on a coordinate of a trip, about 1 m: the key of the directions cache, and the
 * point asked of the provider, so that a cached answer is the answer to its key (Orchestration ›
 * Transitions).
 */
export const COORDINATE_DECIMALS = 5;

const scale = 10 ** COORDINATE_DECIMALS;

/** The point rounded to `COORDINATE_DECIMALS` decimals. */
export function roundedPoint({ lat, lng }: LatLng): LatLng {
  return { lat: Math.round(lat * scale) / scale, lng: Math.round(lng * scale) / scale };
}
