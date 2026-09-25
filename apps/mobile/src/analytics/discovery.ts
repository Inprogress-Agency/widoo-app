import type { AnalyticsEvents } from '@widoo/shared';

/**
 * Properties of the discovery events (wiki Analytics › Découverte), built apart from the screens
 * that send them so that each one is tested against the catalog.
 */

/** Zoom level sent to analytics: a tenth of a level. The zone itself is never sent. */
export function analyticsZoom(zoom: number): number {
  return Math.round(zoom * 10) / 10;
}

/** `map_search_zone`, for an answered search: what started it, the zoom and the count only. */
export function mapSearchZoneEvent(
  search: { trigger: AnalyticsEvents['map_search_zone']['trigger']; view: { zoom: number } },
  resultsCount: number,
): AnalyticsEvents['map_search_zone'] {
  return {
    trigger: search.trigger,
    zoom: analyticsZoom(search.view.zoom),
    results_count: resultsCount,
  };
}

type CardView = AnalyticsEvents['result_card_viewed'];

/**
 * `result_card_viewed` for the cards that came into view and were not seen yet among the results
 * on screen; `seen` keeps them, so that each card counts once per results.
 */
export function newCardViews(
  visible: readonly { route: { id: string }; index: number }[],
  seen: Set<string>,
  sheetLevel: CardView['sheet_level'],
): CardView[] {
  const views: CardView[] = [];
  for (const { route, index } of visible) {
    if (!seen.has(route.id)) {
      seen.add(route.id);
      views.push({ route_id: route.id, position: index, sheet_level: sheetLevel });
    }
  }
  return views;
}

/**
 * `newCardViews` for the results on screen: the cards seen are forgotten as soon as other results
 * come, in the same call. A reset after the render would come after the carousel has already
 * reported the first cards of the new results, and a card seen in the previous zone would be lost.
 */
export function createCardViewTracker() {
  let current: { results: unknown; seen: Set<string> } | null = null;
  return (
    results: unknown,
    visible: readonly { route: { id: string }; index: number }[],
    sheetLevel: CardView['sheet_level'],
  ): CardView[] => {
    if (!current || current.results !== results) {
      current = { results, seen: new Set() };
    }
    return newCardViews(visible, current.seen, sheetLevel);
  };
}

/** `route_opened`: the route and where it was opened from. */
export function routeOpenedEvent(
  route: { id: string },
  source: AnalyticsEvents['route_opened']['source'],
): AnalyticsEvents['route_opened'] {
  return { route_id: route.id, source };
}

type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

/**
 * `app_opened`: a cold start now, then a warm one at each return from the background. Returns
 * what stops listening.
 */
export function watchAppOpened(
  appState: {
    currentState: AppStateStatus;
    addEventListener: (
      type: 'change',
      listener: (next: AppStateStatus) => void,
    ) => { remove: () => void };
  },
  track: (properties: AnalyticsEvents['app_opened']) => void,
): () => void {
  track({ cold_start: true });
  let previous = appState.currentState;
  const subscription = appState.addEventListener('change', (next) => {
    if (previous === 'background' && next === 'active') {
      track({ cold_start: false });
    }
    previous = next;
  });
  return () => subscription.remove();
}
