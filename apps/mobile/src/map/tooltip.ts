import type { LatLng } from '@widoo/shared';
import type { Bounds } from './geo';

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

/**
 * Horizontal position, in points, of a point once the camera fits `bounds` in a map `width`
 * by `height` wide with `padding`: the fit keeps the scale of the tighter side and centres the
 * bounds in the room left by the padding.
 */
export function screenXOnFit(
  point: LatLng,
  bounds: Bounds,
  { width, height, padding }: { width: number; height: number; padding: Padding },
): number {
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
  const offset = Number.isFinite(scale) ? (mercatorX(point.lng) - centreX) * scale : 0;
  return padding.left + roomWidth / 2 + offset;
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
