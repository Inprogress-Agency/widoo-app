import { size, spacing } from '@widoo/tokens';
import type { Padding } from './tooltip';

/**
 * Room a step dot needs around its centre, which the camera puts on the edge of the framed zone:
 * the radius of the dot at its active size, a tapped step (Ecrans › E-04). No gap beyond it: at
 * a large text size the band left to the route above the sheet is already narrow.
 */
export const stepDotClearance = size['step-dot-active'] / 2;

/**
 * Padding of the camera around a selected route: the route fills the lower half of the map, its
 * tooltip the upper half, above the room kept for the results sheet (`sheetCover`, the floating
 * tab bar included) plus the clearance of a step dot, so that the last step never sits half under
 * the sheet. Across, the margin of the screen already holds the clearance of a dot; at the top,
 * the tooltip hangs over the start and covers the upper half of its dot.
 */
export function routeFramePadding({
  viewportHeight,
  tabBarHeight,
  sheetCover,
}: {
  viewportHeight: number;
  tabBarHeight: number;
  sheetCover: number;
}): Padding {
  const side = Math.max(spacing['space-32'], stepDotClearance);
  return {
    top: (viewportHeight - tabBarHeight) / 2,
    right: side,
    bottom: sheetCover + stepDotClearance,
    left: side,
  };
}
