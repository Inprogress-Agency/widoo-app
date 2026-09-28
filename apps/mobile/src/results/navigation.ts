import type { AnalyticsEvents, RouteCard } from '@widoo/shared';
import { router } from 'expo-router';
import { analytics } from '../analytics';
import { routeOpenedEvent } from '../analytics/discovery';
import type { SectionId } from '../discovery/sections';

export type OpenSource = AnalyticsEvents['route_opened']['source'];

/**
 * Where the route sheet (E-05) opens: at a step, from 1, for « Voir plus » of a step tooltip; at
 * its top otherwise.
 */
export function routeHref(route: Pick<RouteCard, 'id'>, step?: number) {
  return {
    pathname: '/route/[id]' as const,
    params: step === undefined ? { id: route.id } : { id: route.id, step: String(step) },
  };
}

/**
 * The route sheet (E-05), provisional until #37, at `step` if given; `route_opened` tells where it
 * was opened from.
 */
export function openRoute(route: RouteCard, source: OpenSource, step?: number) {
  analytics.track('route_opened', routeOpenedEvent(route, source));
  router.push(routeHref(route, step));
}

/** « Voir tout » of a section of the sheet (E-04), pushed on the home stack (M-03). */
export function openSection(section: SectionId) {
  router.push({ pathname: '/section/[id]', params: { id: section } });
}
