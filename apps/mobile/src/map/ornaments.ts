import { size, spacing } from '@widoo/tokens';
import { HALF_TOP } from '../results/sheet';

/** Map ornaments (Mapbox logo and attribution, required) sit in the margin of the screen. */
export const ornamentMargin = spacing['space-8'];

interface OverlayInput {
  /** Height of the map, edge to edge behind the floating tab bar; 0 before its layout. */
  viewportHeight: number;
  /** Status bar: the sheet at full stops under it. */
  topInset: number;
  /** Bottom of the search pill and of the chips over the map, larger text included; 0 if none. */
  topBarBottom: number;
  /** Height the results sheet covers at the foot of the map, the tab bar included. */
  sheetCover: number;
  /** The same height for the sheet at rest. */
  restCover: number;
  /** Bottom safe area, counted by Mapbox under its ornaments on iOS only; 0 on Android. */
  safeBottom: number;
}

interface OverlayLayout {
  /** `bottom` of the Mapbox logo and attribution, as `logoPosition` and `attributionPosition`. */
  ornamentBottom: number;
  /** `bottom` of the row of « Rechercher dans cette zone » and the recentre button; null hidden. */
  controlsBottom: number | null;
}

/**
 * Where the map draws what floats at the foot of it (Ecrans › E-01). The Mapbox logo and
 * attribution sit just above the results sheet at every detent that leaves the map in sight,
 * half included, as Mapbox's terms want them visible; at full, the map is under the sheet and
 * they wait at rest. The controls sit above the attribution button, a 44 point touch target in
 * the corner, so that no tap on them opens it. They show in every state of the map while the sheet
 * stays under its half detent, the message of an empty zone at larger text included, as long as a
 * row of them fits between the top bar and the sheet (D-082); at half and at full, the sheet
 * covers them.
 */
export function mapOverlayLayout({
  viewportHeight,
  topInset,
  topBarBottom,
  sheetCover,
  restCover,
  safeBottom,
}: OverlayInput): OverlayLayout {
  const ornamentsHeight = ornamentMargin + size['touch-min'];
  const isMapAbove = sheetCover + ornamentsHeight <= viewportHeight - topInset;
  const ornamentsAt = isMapAbove ? sheetCover : restCover;
  const controlsBottom = sheetCover + ornamentsHeight + spacing['space-8'];
  const isUnderHalf = sheetCover < viewportHeight - HALF_TOP;
  const isRoomForControls =
    isUnderHalf &&
    controlsBottom + size['touch-min'] <= viewportHeight - Math.max(topInset, topBarBottom);
  return {
    ornamentBottom: ornamentsAt + ornamentMargin - safeBottom,
    controlsBottom: isRoomForControls ? controlsBottom : null,
  };
}
