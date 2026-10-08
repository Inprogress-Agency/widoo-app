import type { AnalyticsEvents, RouteCard } from '@widoo/shared';
import { router } from 'expo-router';
import { analytics } from '../analytics';
import { routeOpenedEvent } from '../analytics/discovery';
import type { SectionId } from '../discovery/sections';
import type { TooltipStep } from '../map/tooltip';

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
 * The route sheet (E-05), provisional until #37, at the step of a tooltip if given;
 * `route_opened` tells where it was opened from, and the step, from 0, when the user tapped it.
 */
export function openRoute(route: RouteCard, source: OpenSource, step?: TooltipStep) {
  const stepIndex = step?.isTapped ? step.position - 1 : undefined;
  analytics.track('route_opened', routeOpenedEvent(route, source, stepIndex));
  router.push(routeHref(route, step?.position));
}

/** Where « Voir tout » is tapped from: the detent, the sort of the list, the count shown. */
export type SectionOpening = Omit<AnalyticsEvents['section_opened'], 'section'>;

/**
 * « Voir tout » of a section of the sheet (E-04), pushed on the home stack (M-03):
 * `section_opened` with the detent it was tapped from, the sort of the list and the count shown.
 */
export function openSection(section: SectionId, from: SectionOpening) {
  analytics.track('section_opened', { section, ...from });
  router.push({ pathname: '/section/[id]', params: { id: section } });
}
