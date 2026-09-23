import { describe, expect, it } from 'vitest';
import { colors, palette } from '.';

/** WCAG 2.2 relative luminance of a `#RRGGBB` color. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light = 1, dark = 0] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

describe('contrast', () => {
  it('matches the ratios of the accessibility check (D-007)', () => {
    expect(contrast(palette.blueBright, palette.warmGrey)).toBeCloseTo(4.1, 1);
    expect(contrast(palette.white, palette.white)).toBe(1);
    expect(contrast('#000000', palette.white)).toBe(21);
  });

  it.each([
    ['text', colors.text, colors.background],
    ['text on surface', colors.text, colors.surface],
    ['muted text', colors.textMuted, colors.background],
    ['muted text on surface', colors.textMuted, colors.surface],
    ['link', colors.link, colors.background],
    ['link on surface', colors.linkOnSurface, colors.surface],
    ['button label', colors.onPrimary, colors.primary],
    ['text on ink', colors.onInverse, colors.inverse],
    ['Vérifié badge', palette.verifiedText, palette.verifiedSurface],
    ['Signature badge', palette.signatureText, palette.signatureSurface],
  ])('keeps %s at 4.5:1 at least', (_role, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['active tab icon', colors.tabIconActive, colors.inverse],
    ['unchecked outline', colors.outline, colors.background],
    ['accent', colors.accent, colors.background],
  ])('keeps the %s at 3:1 at least', (_role, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});
