import type { LatLng, RouteSearchQuery } from '@widoo/shared';

/** Mapbox order: longitude first. */
export type LngLat = [lng: number, lat: number];

/** Corners of a map area, as the Mapbox camera takes them. */
export interface Bounds {
  ne: LngLat;
  sw: LngLat;
}

export type Bbox = RouteSearchQuery['bbox'];

/** Paris centre, at the Hôtel de Ville: the map opens there without the user's position. */
export const parisCenter: LatLng = { lat: 48.8566, lng: 2.3522 };

/** The home map opens on about 3 km around its centre (Ecrans › E-01). */
export const initialSpanM = 3000;

export const toLngLat = ({ lat, lng }: LatLng): LngLat => [lng, lat];

/** Smallest area holding every point; null without point. */
export function boundsOf(points: readonly LatLng[]): Bounds | null {
  const [first, ...others] = points;
  if (!first) {
    return null;
  }
  let [west, south, east, north] = [first.lng, first.lat, first.lng, first.lat];
  for (const { lat, lng } of others) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return { ne: [east, north], sw: [west, south] };
}

/** Zone of the search API from the corners of the visible map. */
export function toBbox({ ne, sw }: Bounds): Bbox {
  return { west: sw[0], south: sw[1], east: ne[0], north: ne[1] };
}

/** Earth circumference at the equator, in meters, and the Mapbox tile size, in points. */
const earthCircumferenceM = 40_075_016.686;
const tileSize = 512;

/**
 * Mapbox zoom level at which `spanM` meters fill `widthPts` points at the latitude of `center`.
 * The camera opens at a centre and this zoom rather than on bounds, which Android computes before
 * the map has a size.
 */
export function zoomForSpan(center: LatLng, spanM: number, widthPts: number): number {
  const metersAtZoomZero = earthCircumferenceM * Math.cos((center.lat * Math.PI) / 180);
  return Math.log2((metersAtZoomZero * widthPts) / (tileSize * spanM));
}
