import type { AnalyticsEvents } from '@widoo/shared';

export type ScrollDepth = AnalyticsEvents['route_scrolled']['depth'];

/**
 * Depths of `route_scrolled`, top to bottom (wiki Analytics › Découverte): `info` the sections
 * after the description, `timeline` the title « Les étapes », `steps` « Fin du parcours », once
 * every step has passed, `end` the bottom of the sheet.
 */
export const scrollDepths: readonly ScrollDepth[] = ['info', 'timeline', 'steps', 'end'];

/**
 * The depths whose top has come into view and were not reached yet in this opening of the sheet;
 * `reached` keeps them, so that each depth is sent once.
 */
export function newScrollDepths(
  tops: Partial<Record<ScrollDepth, number>>,
  visibleBottom: number,
  reached: Set<ScrollDepth>,
): ScrollDepth[] {
  const reachedNow = scrollDepths.filter((depth) => {
    const top = tops[depth];
    return top !== undefined && top <= visibleBottom && !reached.has(depth);
  });
  for (const depth of reachedNow) {
    reached.add(depth);
  }
  return reachedNow;
}
