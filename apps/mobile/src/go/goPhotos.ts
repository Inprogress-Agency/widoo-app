import type { Photo, PlannedRoute, PlannedRouteStep, RouteDetail } from '@widoo/shared';

/**
 * The big photo of the step on E-07: the first of « En images », else the photo of its place,
 * else the cover of the route. The photos of the step come with the planning, kept offline; the
 * place and the cover only with the full route.
 */
export function bigPhotoOf(step: PlannedRouteStep | null, route: RouteDetail | null): Photo | null {
  const detail = step ? route?.steps.find((candidate) => candidate.id === step.id) : undefined;
  return (
    step?.photos[0] ??
    (detail && !detail.isLocked ? detail.place.photo : null) ??
    route?.photos[0] ??
    null
  );
}

/**
 * Every photo the Go may show, once each: those of the steps, then the places and the cover once
 * the full route has answered. Read at the start to be kept on the phone for the way offline.
 */
export function goPhotoUrls(planned: PlannedRoute, route: RouteDetail | null): string[] {
  const urls = [
    ...planned.route.steps.flatMap((step) => step.photos.map((photo) => photo.url)),
    ...(route?.steps ?? []).flatMap((step) =>
      !step.isLocked && step.place.photo ? [step.place.photo.url] : [],
    ),
    ...(route?.photos.slice(0, 1).map((photo) => photo.url) ?? []),
  ];
  return [...new Set(urls)];
}
