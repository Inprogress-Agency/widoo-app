import type { AnalyticsEvents, RouteCard } from '@widoo/shared';
import { router } from 'expo-router';
import { analytics } from '../analytics';
import { routeOpenedEvent } from '../analytics/discovery';
import type { SectionId } from '../discovery/sections';

export type OpenSource = AnalyticsEvents['route_opened']['source'];

/** The route sheet (E-05), provisional until #37; `route_opened` tells where it was opened from. */
export function openRoute(route: RouteCard, source: OpenSource) {
  analytics.track('route_opened', routeOpenedEvent(route, source));
  router.push({ pathname: '/route/[id]', params: { id: route.id } });
}

/** « Voir tout » of a section of the sheet (E-04), pushed on the home stack (M-03). */
export function openSection(section: SectionId) {
  router.push({ pathname: '/section/[id]', params: { id: section } });
}
