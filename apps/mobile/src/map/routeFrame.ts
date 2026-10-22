import { size, spacing } from '@widoo/tokens';
import type { Padding } from './tooltip';

/**
 * Room a step dot needs around its centre, which the camera puts on the edge of the framed zone:
 * the radius of the dot at its active size, a tapped step (Ecrans › E-04). No gap beyond it: at
 * a large text size the band left to the route above the sheet is already narrow.
 */
export const stepDotClearance = size['step-dot-active'] / 2;

/**
 * Gap between the bar at the top of the map and a tooltip hanging over the highest step: the
 * margin a tooltip keeps from the edges of the screen (Ecrans › E-04, #626).
 */
export const topBarGap = spacing['space-16'];

/** Least height left to the route between the tooltip and the sheet: one step touch target. */
export const minRouteBand = size['touch-min'];

/** Least room the camera frames the route in, when the bar, the tooltip and the sheet leave none. */
export const leastRouteBand = 1;

/**
 * Padding of the camera around a selected route (Ecrans › E-04, D-089): the route and the tooltip
 * of its start fit whole in the map left in sight, under the bar at the top of the map (status
 * bar, search pill and quick chips, `topBarHeight` as laid out) and above the room kept for the
 * results sheet (`sheetCover`, the floating tab bar included). At the bottom, the clearance of a
 * step dot, so that the last step never sits half under the sheet; across, the margin of the
 * screen already holds it.
 *
 * At the top, the highest step sits the measured height of its tooltip, and a gap, below the bar:
 * no tooltip of the route hangs under the bar while the map is not moved (#322, #626), however
 * far the map zooms out for it (D-089). Above that, the tooltip is given the upper half of the
 * map, as long as the route keeps `minRouteBand` above the sheet. Both heights are 0 before their
 * layout. Between the bar, the tooltip and the sheet, the route keeps whatever band is left, the
 * map zooming out until it fits, its dots overlapping if they must: the user zooms in on them.
 * Only when nothing is left does the bottom give way to `leastRouteBand`, the sheet then covering
 * the foot of the route rather than the bar the tooltip.
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
  const underTopBar = topBarHeight + topBarGap + tooltipHeight;
  const aboveSheet = sheetCover + stepDotClearance;
  const upperHalf = (viewportHeight - tabBarHeight) / 2;
  const top = Math.max(
    underTopBar,
    Math.min(upperHalf, viewportHeight - aboveSheet - minRouteBand),
  );
  return {
    top,
    right: side,
    bottom: Math.max(0, Math.min(aboveSheet, viewportHeight - top - leastRouteBand)),
    left: side,
  };
}
