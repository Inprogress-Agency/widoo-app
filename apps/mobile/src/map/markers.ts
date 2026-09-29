import type { PlaceCategory, RouteCard } from '@widoo/shared';
import type { Feature, FeatureCollection, LineString, Point as GeoPoint } from 'geojson';
import { boundsOf, toLngLat, type Bounds, type LngLat } from './geo';
import { emptyMarkerImage } from './markerShape';

/**
 * What the map draws: one point per route at its start for the photo markers, drawn by layers
 * from images named here and a duration text; the path and the step dots of the selected route.
 */

/** Route, image and duration of a point: the layers read the image and the text, a tap the route. */
export interface PointProperties {
  routeId: string;
  image: string;
  duration: string;
}

export const markerImage = (routeId: string) => `route-${routeId}`;

/**
 * One photo marker per route, at its start; a route without step has no place on the map. The
 * photo box stays empty until the image of the route is drawn.
 */
export function routeMarkers(
  routes: readonly RouteCard[],
  {
    isDrawn,
    durationOf,
  }: { isDrawn: (image: string) => boolean; durationOf: (route: RouteCard) => string },
): FeatureCollection<GeoPoint, PointProperties> {
  return {
    type: 'FeatureCollection',
    features: routes.flatMap((route) => {
      const start = route.steps[0];
      return start
        ? [
            {
              type: 'Feature' as const,
              id: route.id,
              geometry: { type: 'Point' as const, coordinates: toLngLat(start.location) },
              properties: {
                routeId: route.id,
                image: isDrawn(markerImage(route.id)) ? markerImage(route.id) : emptyMarkerImage,
                duration: durationOf(route),
              },
            },
          ]
        : [];
    }),
  };
}

/*
 * The selected route is drawn from the lock of its card, never from its access (D-075): a locked
 * card shows neither path nor steps, its start alone as the locked dot (D-014); an unlocked
 * Premium card is drawn as a free one.
 */

/** Path between the steps, in step order: straight lines until the directions reach the card. */
export function routePath(route: RouteCard): Feature<LineString> | null {
  if (route.isLocked || route.steps.length < 2) {
    return null;
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: route.steps.map((step) => toLngLat(step.location)),
    },
    properties: {},
  };
}

/** A step of the selected route on the map; no category for the locked start (D-014). */
export interface Stop {
  key: string;
  location: LngLat;
  category: PlaceCategory | null;
}

/** Step dots of the selected route; only the start, as a locked dot, for a locked card. */
export function routeStops(route: RouteCard): Stop[] {
  const steps = route.isLocked ? route.steps.slice(0, 1) : route.steps;
  return steps.map((step, index) => ({
    key: `${route.id}-${index}`,
    location: toLngLat(step.location),
    category: route.isLocked ? null : step.category,
  }));
}

/**
 * What the camera frames when a route is selected: its steps, or only its start, kept at the
 * current zoom, for a locked card or a route of a single step.
 */
export function selectionFrame(route: RouteCard): { bounds: Bounds } | { center: LngLat } | null {
  const start = route.steps[0];
  if (!start) {
    return null;
  }
  const bounds = boundsOf(route.steps.map((step) => step.location));
  if (route.isLocked || route.steps.length < 2 || !bounds) {
    return { center: toLngLat(start.location) };
  }
  return { bounds };
}
