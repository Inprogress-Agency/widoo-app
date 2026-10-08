import { size, spacing } from '@widoo/tokens';
import type { Padding } from './tooltip';

/**
 * Room a step dot needs around its centre, which the camera puts on the edge of the framed zone:
 * the radius of the dot at its active size, a tapped step (Ecrans › E-04). No gap beyond it: at
 * a large text size the band left to the route above the sheet is already narrow.
 */
export const stepDotClearance = size['step-dot-active'] / 2;

/** Gap between the bar at the top of the map and a tooltip hanging over the highest step. */
export const topBarGap = spacing['space-8'];

/** Least height left to the route when the tooltip pushes it down: one step touch target. */
export const minRouteBand = size['touch-min'];

/**
 * Padding of the camera around a selected route: the route fills the lower half of the map, its
 * tooltip the upper half, above the room kept for the results sheet (`sheetCover`, the floating
 * tab bar included) plus the clearance of a step dot, so that the last step never sits half under
 * the sheet. Across, the margin of the screen already holds the clearance of a dot; at the top,
 * the tooltip hangs over the start and covers the upper half of its dot.
 *
 * The upper half grows when the tooltip would pass under the bar at the top of the map (status
 * bar, search pill and quick chips, `topBarHeight` as laid out): the highest step then sits the
 * measured height of the tooltip, and a gap, below the bar, so that no tooltip of the route
 * hangs under it while the map is not moved. Both heights are 0 before their layout. It grows
 * only while the route keeps `minRouteBand` between the tooltip and the sheet: below, the map
 * would zoom out of the route's neighbourhood (#305); it never shrinks under the upper half.
 */
export function routeFramePadding({
  viewportHeight,
  tabBarHeight,
  sheetCover,
  topBarHeight,
  tooltipHeight,
}: {
  viewportHeight: number;
  tabBarHeight: number;
  sheetCover: number;
  topBarHeight: number;
  tooltipHeight: number;
}): Padding {
  const side = Math.max(spacing['space-32'], stepDotClearance);
  const bottom = sheetCover + stepDotClearance;
  const upperHalf = (viewportHeight - tabBarHeight) / 2;
  const underTopBar = topBarHeight + topBarGap + tooltipHeight;
  const aboveRouteBand = viewportHeight - bottom - minRouteBand;
  return {
    top: Math.max(upperHalf, Math.min(underTopBar, aboveRouteBand)),
    right: side,
    bottom,
    left: side,
  };
}
