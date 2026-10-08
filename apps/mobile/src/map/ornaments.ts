import { size, spacing } from '@widoo/tokens';

/** Map ornaments (Mapbox logo and attribution, required) sit in the margin of the screen. */
export const ornamentMargin = spacing['space-8'];

interface OverlayInput {
  /** Height of the map, edge to edge behind the floating tab bar; 0 before its layout. */
  viewportHeight: number;
  /** Status bar: the sheet at full stops under it. */
  topInset: number;
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
 * the corner, so that no tap on them opens it; beyond half the map, the sheet covers them.
 */
export function mapOverlayLayout({
  viewportHeight,
  topInset,
  sheetCover,
  restCover,
  safeBottom,
}: OverlayInput): OverlayLayout {
  const ornamentsHeight = ornamentMargin + size['touch-min'];
  const isMapAbove = sheetCover + ornamentsHeight <= viewportHeight - topInset;
  const ornamentsAt = isMapAbove ? sheetCover : restCover;
  const isSheetLow = sheetCover <= viewportHeight / 2;
  return {
    ornamentBottom: ornamentsAt + ornamentMargin - safeBottom,
    controlsBottom: isSheetLow ? sheetCover + ornamentsHeight + spacing['space-8'] : null,
  };
}
