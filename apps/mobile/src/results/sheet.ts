import { size, spacing } from '@widoo/tokens';

/** The three detents of the results sheet, as `result_card_viewed` reports them (wiki Analytics). */
export const sheetLevels = ['rest', 'half', 'full'] as const;
export type SheetLevel = (typeof sheetLevels)[number];

/**
 * Top of the half detent from the top of the screen (Ecrans › E-04: « haut à 296 px »):
 * tokens.json sizes the rest detent only.
 */
export const HALF_TOP = 296;

interface SnapPointsInput {
  /** Height of the screen the sheet lives in, above the tab bar. */
  containerHeight: number;
  /** Status bar: the full detent stops under it. */
  topInset: number;
  /** What the rest detent must show whole: handle and header, or a message, or the summary. */
  peekHeight: number;
}

/**
 * Heights of the three detents (M-04, Ecrans › E-04), from the bottom of the screen: rest, 120
 * points at least and as high as its content needs, such as the header at large text sizes or
 * the summary of a selected route; half, its top at 296 points; full, under the status bar.
 * Each detent stays above the previous one, whatever the screen.
 */
export function sheetSnapPoints({
  containerHeight,
  topInset,
  peekHeight,
}: SnapPointsInput): [number, number, number] {
  const gap = spacing['space-4'];
  const full = Math.max(containerHeight - topInset, size['sheet-rest'] + 2 * gap);
  const half = Math.min(Math.max(containerHeight - HALF_TOP, size['sheet-rest'] + gap), full - gap);
  const rest = Math.min(Math.max(size['sheet-rest'], Math.ceil(peekHeight)), half - gap);
  return [rest, half, full];
}
