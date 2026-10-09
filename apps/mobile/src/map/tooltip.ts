import type { LatLng } from '@widoo/shared';
import type { Bounds } from './geo';

/** The step a tooltip of the map points at when « Voir plus » is tapped (Ecrans › E-04). */
export interface TooltipStep {
  /** From 1, as the sheet shows it. */
  position: number;
  /** Tapped by the user, rather than the start the tooltip opens on. */
  isTapped: boolean;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Web Mercator, as Mapbox projects: x and y from 0 to 1 across the world. */
const mercatorX = (lng: number) => (lng + 180) / 360;
const mercatorY = (lat: number) => {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
};

/** A point on the screen, in points from the top left corner of the map. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Where a point is on the screen, in points, once the camera fits `bounds` in a map `width` by
 * `height` wide with `padding`: the fit keeps the scale of the tighter side and centres the
 * bounds in the room left by the padding.
 */
export function screenPointOnFit(
  point: LatLng,
  bounds: Bounds,
  { width, height, padding }: { width: number; height: number; padding: Padding },
): ScreenPoint {
  const [east, north] = bounds.ne;
  const [west, south] = bounds.sw;
  const roomWidth = width - padding.left - padding.right;
  const roomHeight = height - padding.top - padding.bottom;
  const spanX = mercatorX(east) - mercatorX(west);
  const spanY = mercatorY(south) - mercatorY(north);
  const scale = Math.min(
    spanX > 0 ? roomWidth / spanX : Infinity,
    spanY > 0 ? roomHeight / spanY : Infinity,
  );
  const centreX = (mercatorX(east) + mercatorX(west)) / 2;
  const centreY = (mercatorY(south) + mercatorY(north)) / 2;
  const isScaled = Number.isFinite(scale);
  return {
    x: padding.left + roomWidth / 2 + (isScaled ? (mercatorX(point.lng) - centreX) * scale : 0),
    y: padding.top + roomHeight / 2 + (isScaled ? (mercatorY(point.lat) - centreY) * scale : 0),
  };
}

/**
 * Where the tooltip hangs from its anchor, from 0 (left edge) to 1 (right edge): centred on the
 * point when it can, shifted so that it stays `margin` away from the screen edges otherwise.
 * Its arrow keeps pointing at the start.
 */
export function tooltipAnchorX(
  pointX: number,
  {
    screenWidth,
    tooltipWidth,
    margin,
  }: { screenWidth: number; tooltipWidth: number; margin: number },
): number {
  const leftmost = (pointX - (screenWidth - margin - tooltipWidth)) / tooltipWidth;
  const rightmost = (pointX - margin) / tooltipWidth;
  return Math.min(Math.max(0.5, leftmost), rightmost, 1);
}

/** Above its step, the arrow at the bottom, or below it, the arrow at the top (Ecrans › E-04). */
export type TooltipSide = 'above' | 'below';

/** Does a dot of `radius` around `centre` reach into the box from `left` to `right`, `top` to `bottom`? */
const isDotInBox = (
  centre: ScreenPoint,
  radius: number,
  box: { left: number; right: number; top: number; bottom: number },
) => {
  const dx = centre.x - Math.min(Math.max(centre.x, box.left), box.right);
  const dy = centre.y - Math.min(Math.max(centre.y, box.top), box.bottom);
  return dx * dx + dy * dy < radius * radius;
};

/**
 * Side of its step the tooltip hangs on (D-084): above by default; below, its arrow at the top,
 * when above it would cover another step dot of the route, the start included, while below it
 * covers none and stays above `roomBottom`, the top of the results sheet. When both sides would
 * cover a step, it stays above (#335). `step` and `others` are the centres of the dots on the
 * screen; `height` holds the arrow and the gap to the dot, `anchor` is where it hangs across, from
 * 0 to 1 (`tooltipAnchorX`).
 */
export function tooltipSide(
  step: ScreenPoint,
  others: readonly ScreenPoint[],
  {
    width,
    height,
    anchor,
    dotRadius,
    roomBottom,
  }: { width: number; height: number; anchor: number; dotRadius: number; roomBottom: number },
): TooltipSide {
  const left = step.x - anchor * width;
  const covers = (top: number, bottom: number) =>
    others.some((other) =>
      isDotInBox(other, dotRadius, { left, right: left + width, top, bottom }),
    );
  if (!covers(step.y - height, step.y)) {
    return 'above';
  }
  const isBelowFree = step.y + height <= roomBottom && !covers(step.y, step.y + height);
  return isBelowFree ? 'below' : 'above';
}
