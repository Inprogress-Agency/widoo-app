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
  /** Height of the screen the sheet lives in, edge to edge behind the floating tab bar. */
  containerHeight: number;
  /** Height of the floating tab bar: the sheet runs under it, its detents are counted above it. */
  barHeight: number;
  /** Status bar: the full detent stops under it. */
  topInset: number;
  /** What the rest detent must show whole: handle and header, or a message, or the summary. */
  peekHeight: number;
}

/**
 * Heights of the three detents (M-04, Ecrans › E-04), from the bottom of the screen, where the
 * sheet runs under the floating tab bar: rest, 120 points at least above the bar and as high as
 * its content needs, such as the header at large text sizes or the summary of a selected route;
 * half, its top at 296 points; full, under the status bar. Each detent stays above the previous
 * one, whatever the screen.
 */
export function sheetSnapPoints({
  containerHeight,
  barHeight,
  topInset,
  peekHeight,
}: SnapPointsInput): [number, number, number] {
  const gap = spacing['space-4'];
  const lowest = barHeight + size['sheet-rest'];
  const full = Math.max(containerHeight - topInset, lowest + 2 * gap);
  const half = Math.min(Math.max(containerHeight - HALF_TOP, lowest + gap), full - gap);
  const rest = Math.min(
    barHeight + Math.max(size['sheet-rest'], Math.ceil(peekHeight)),
    half - gap,
  );
  return [rest, half, full];
}
