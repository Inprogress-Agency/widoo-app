import type { LatLng } from '@widoo/shared';
import type { Bounds, LngLat } from './geo';

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
const longitudeOf = (x: number) => x * 360 - 180;
const latitudeOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/** Width of the world at zoom 0, in points: the Mapbox tile size (`geo.ts`). */
const worldSizeAtZoomZero = 512;

/** A point on the screen, in points from the top left corner of the map. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** A map `width` by `height` wide, and the padding of the camera around the zone it frames. */
export interface FitViewport {
  width: number;
  height: number;
  padding: Padding;
}

/**
 * How the camera fits `bounds` in the viewport: the scale of the tighter side, in points per
 * world width, infinite for a single point, and the centre of the bounds, put in the middle of
 * the room left by the padding.
 */
function fitOf(bounds: Bounds, { width, height, padding }: FitViewport) {
  const [east, north] = bounds.ne;
  const [west, south] = bounds.sw;
  const roomWidth = width - padding.left - padding.right;
  const roomHeight = height - padding.top - padding.bottom;
  const spanX = mercatorX(east) - mercatorX(west);
  const spanY = mercatorY(south) - mercatorY(north);
  return {
    scale: Math.min(
      spanX > 0 ? roomWidth / spanX : Infinity,
      spanY > 0 ? roomHeight / spanY : Infinity,
    ),
    centreX: (mercatorX(east) + mercatorX(west)) / 2,
    centreY: (mercatorY(south) + mercatorY(north)) / 2,
    room: { x: padding.left + roomWidth / 2, y: padding.top + roomHeight / 2 },
  };
}

/**
 * Where a point is on the screen, in points, once the camera fits `bounds` in a map `width` by
 * `height` wide with `padding` (`cameraOnFit`): the fit keeps the scale of the tighter side and
 * centres the bounds in the room left by the padding.
 */
export function screenPointOnFit(
  point: LatLng,
  bounds: Bounds,
  viewport: FitViewport,
): ScreenPoint {
  const { scale, centreX, centreY, room } = fitOf(bounds, viewport);
  const isScaled = Number.isFinite(scale);
  return {
    x: room.x + (isScaled ? (mercatorX(point.lng) - centreX) * scale : 0),
    y: room.y + (isScaled ? (mercatorY(point.lat) - centreY) * scale : 0),
  };
}

/**
 * Centre and zoom of the camera that fits `bounds` in the room left by the padding, as
 * `screenPointOnFit` places the points; null for a single point, which has no zoom of its own.
 * The camera takes them with the padding rather than the bounds: fitting bounds, the native map
 * adds the padding the camera already has to the one given, on Android at least (#305), and the
 * route lands elsewhere than the tooltip and the frame expect.
 */
export function cameraOnFit(
  bounds: Bounds,
  viewport: FitViewport,
): { centerCoordinate: LngLat; zoomLevel: number } | null {
  const { scale, centreX, centreY } = fitOf(bounds, viewport);
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }
  return {
    centerCoordinate: [longitudeOf(centreX), latitudeOf(centreY)],
    zoomLevel: Math.log2(scale / worldSizeAtZoomZero),
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
