import { size } from '@widoo/tokens';
import type { LngLat } from './geo';
import type { Padding } from './tooltip';

/**
 * Least height of map left in sight between the bar at the top and the results sheet for the
 * camera to centre the opening view in it: one touch target. Narrower, at full, the map is under
 * the sheet and the camera waits for it to come down.
 */
export const minVisibleBand = size['touch-min'];

/** No padding: the centre of the camera is the centre of the map view. */
export const noPadding: Padding = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Padding of the camera that puts its centre, the user's position or Paris, in the middle of the
 * map left in sight (Ecrans › E-01, recentrer): under the bar at the top (`topBarHeight`, status
 * bar, search pill and quick chips, as laid out) and above the results sheet (`sheetCover`, the
 * floating tab bar included), whatever its detent. Always given: a camera move without padding
 * keeps the last one on Android, such as that of a card focused with the sheet at full, and drops
 * it on iOS (#334). Null before the layout of the map, or when the band left in sight is narrower
 * than `minVisibleBand`.
 */
export function visibleZonePadding({
  viewportHeight,
  topBarHeight,
  sheetCover,
}: {
  viewportHeight: number;
  topBarHeight: number;
  sheetCover: number;
}): Padding | null {
  const band = viewportHeight - topBarHeight - sheetCover;
  if (viewportHeight <= 0 || band < minVisibleBand) {
    return null;
  }
  return { top: topBarHeight, right: 0, bottom: sheetCover, left: 0 };
}

/** Under a quarter of a point: the same padding once rounded by the native map. */
const paddingTolerance = 0.25;

export function isSamePadding(a: Padding, b: Padding): boolean {
  return (
    Math.abs(a.top - b.top) < paddingTolerance &&
    Math.abs(a.right - b.right) < paddingTolerance &&
    Math.abs(a.bottom - b.bottom) < paddingTolerance &&
    Math.abs(a.left - b.left) < paddingTolerance
  );
}

/** Padding of `@rnmapbox/maps`, each side given: none is kept from the camera before. */
export function cameraPaddingOf(padding: Padding) {
  return {
    paddingTop: padding.top,
    paddingRight: padding.right,
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
  };
}

/**
 * The camera has settled on `target`: its centre, the centre of the padded view, and its zoom.
 * The zone the map shows is not centred on it once the camera is padded.
 */
export function isSettledOn(
  settled: { center: LngLat; zoom: number },
  target: { centerCoordinate: LngLat; zoomLevel: number },
): boolean {
  const [lng, lat] = settled.center;
  const [targetLng, targetLat] = target.centerCoordinate;
  return (
    Math.abs(lng - targetLng) < 1e-5 &&
    Math.abs(lat - targetLat) < 1e-5 &&
    Math.abs(settled.zoom - target.zoomLevel) < 1e-2
  );
}
