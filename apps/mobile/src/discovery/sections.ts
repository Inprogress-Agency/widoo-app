import type { LatLng, RouteCard, RouteSearchResult, RouteSort } from '@widoo/shared';
import { distanceBetweenM, type Bbox } from '../map/geo';

/**
 * Sections of the results sheet (Ecrans › E-01, E-04), each with its carousel and its « Voir
 * tout » list. « À proximité » only for now: the weather section waits for the forecast (#31),
 * « Les Signature Widoo » for a search that filters them (#63).
 */
export const sectionIds = ['nearby'] as const;
export type SectionId = (typeof sectionIds)[number];

export function isSectionId(value: unknown): value is SectionId {
  return sectionIds.some((id) => id === value);
}

/** The sorts of « Trier par », in the order of the sheet (Ecrans › E-04). */
export const listSorts = [
  'recommended',
  'distance',
  'duration',
  'rating',
] as const satisfies readonly RouteSort[];

/**
 * The sort the list shows: by distance only with the user's position; without it, recommended,
 * which has no proximity part (Ecrans › E-04, tri sans position).
 */
export function effectiveSort(sort: RouteSort, hasPosition: boolean): RouteSort {
  return sort === 'distance' && !hasPosition ? 'recommended' : sort;
}

/**
 * The sort asked of the API. The position never leaves the device (Securite-et-RGPD): the
 * distance sort is made on the device, from the routes of the zone in the recommended order.
 */
export function serverSort(sort: RouteSort): RouteSort {
  return sort === 'distance' ? 'recommended' : sort;
}

/**
 * The routes of the pages in order, each once: a route that a next page repeats, such as one
 * published between two pages, stays where it first came.
 */
export function mergePages(pages: readonly RouteSearchResult[]): RouteCard[] {
  const seen = new Set<string>();
  const routes: RouteCard[] = [];
  for (const page of pages) {
    for (const route of page.items) {
      if (!seen.has(route.id)) {
        seen.add(route.id);
        routes.push(route);
      }
    }
  }
  return routes;
}

/**
 * Routes from the nearest start to the farthest, as the distance tag of the cards measures it;
 * a route without step comes last. Stable: equal distances keep the recommended order.
 */
export function sortByDistance(routes: readonly RouteCard[], position: LatLng): RouteCard[] {
  const distance = (route: RouteCard) => {
    const start = route.steps[0];
    return start ? distanceBetweenM(position, start.location) : Number.POSITIVE_INFINITY;
  };
  return routes
    .map((route) => ({ route, meters: distance(route) }))
    .sort((a, b) => a.meters - b.meters)
    .map(({ route }) => route);
}

/**
 * Radius of the zone searched, for « Autour de République · rayon 2 km »: from its centre to
 * its nearest edge, so that everything within it is in the zone.
 */
export function zoneRadiusM({ west, south, east, north }: Bbox): number {
  const center = { lat: (south + north) / 2, lng: (west + east) / 2 };
  const halfWidth = distanceBetweenM(center, { lat: center.lat, lng: east });
  const halfHeight = distanceBetweenM(center, { lat: north, lng: center.lng });
  return Math.min(halfWidth, halfHeight);
}
