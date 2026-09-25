import { accessibility, radius, size, spacing, textStyles } from '@widoo/tokens';

/**
 * Shape of a route marker on the map (Direction-Artistique › Carte), in points: the photo with
 * rounded corners and a white rim, its point below, then the duration label. The map draws it
 * with two symbol layers, the photo and its point from an image made by the app, the label as a
 * text of the map on a white pill: no React view per marker.
 */

const durationText = textStyles['number-s'];

/** Photo box of a route whose photo is not drawn yet, or which has none. */
export const emptyMarkerImage = 'marker-empty';
/** White pill under the duration label. */
export const labelPillImage = 'marker-label-pill';

/**
 * White rim of the photo. tokens.json has no stroke width yet: 2 points, as the `border-2` of the
 * view marker it replaces (reported on the Inbox, #4).
 */
export const rimWidth = 2;

/** Half the diagonal of the point, a square of `space-12` turned by 45°. */
const pointReach = (spacing['space-12'] * Math.SQRT2) / 2;

/** The photo, its rim and its point, as drawn in the marker image. */
export const markerPhoto = {
  side: size.marker,
  radius: radius['radius-card'],
  rim: rimWidth,
  /** Depth of the point under the photo: the tip of the turned square. */
  pointDepth: pointReach,
  /** Image size: the photo, and the point under it. */
  width: size.marker,
  height: size.marker + Math.ceil(pointReach),
} as const;

/**
 * Gap from the bottom of the photo to the top of the label: the turned square reaches
 * `space-6` below the photo in layout, then `space-4` of margin, as in the view marker.
 */
const labelGap = spacing['space-6'] + spacing['space-4'];

/**
 * Text factor of the duration label: the system text setting, capped for dense components
 * (`mappings.accessibility`). `maxFontSizeMultiplier` does not reach a text of the map.
 */
export function durationTextFactor(fontScale: number): number {
  return Math.min(fontScale, accessibility.maxFontSizeMultiplierDense);
}

/** The duration label: text size of `number-s` times the capped factor, on a white pill. */
export function durationLabel(fontScale: number) {
  const factor = durationTextFactor(fontScale);
  const height = Math.max(size['badge-h'], durationText.lineHeight * factor);
  const textSize = durationText.fontSize * factor;
  return {
    textSize,
    /** The pill keeps its height and stretches in width around the text. */
    pillHeight: height,
    paddingX: spacing['space-10'],
    /** The pill hangs by its bottom, the text is centred in it: an offset in ems of the text. */
    textOffsetY: -height / 2 / textSize,
  };
}

/**
 * Pill of the label, stretched in width by the map around the text: two half discs joined by a
 * one point column, the only part that stretches, so that the ends stay round.
 */
export function labelPill(pillHeight: number) {
  const radiusPt = pillHeight / 2;
  return {
    width: pillHeight + 1,
    height: pillHeight,
    radius: radiusPt,
    stretchX: [[radiusPt, radiusPt + 1]] as [number, number][],
  };
}

/**
 * Offset of the photo image above the point of the route, where the label hangs by its bottom:
 * the photo image ends under the tip of its point, just above the label.
 */
export function photoOffsetY(pillHeight: number): number {
  return -(pillHeight + labelGap - (markerPhoto.height - markerPhoto.side));
}

/** Square taken from the middle of a photo, which fills the photo box of the marker. */
export function coverSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { x: (width - side) / 2, y: (height - side) / 2, side };
}
