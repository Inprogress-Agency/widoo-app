import { describe, expect, it } from 'vitest';
import { colors, moodDots, type ColorToken } from '../generated/theme';

/** WCAG 2.2 relative luminance of a `#RRGGBB` color. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: ColorToken, background: ColorToken): number {
  const [light = 1, dark = 0] = [luminance(colors[foreground]), luminance(colors[background])].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

// Pairs of Direction-Artistique › Couleurs: text at 4.5:1, components and meaningful icons at
// 3:1 (WCAG 2.2). Translucent badges are measured on their own background in the wiki.
describe('contrast of the generated colors', () => {
  it('matches the ratios of the accessibility check (D-007)', () => {
    expect(contrast('blue', 'surface')).toBeCloseTo(4.1, 1);
    expect(contrast('blue', 'bg')).toBeCloseTo(4.51, 2);
  });

  it.each([
    ['ink', 'bg'],
    ['ink', 'surface'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['blue', 'bg'],
    ['blue-ink', 'surface'],
    ['blue-ink', 'blue-soft'],
    ['on-blue', 'blue'],
    ['on-strong', 'surface-strong'],
    ['on-strong-muted', 'surface-strong'],
    ['green-ink', 'bg'],
    ['green-ink', 'green-soft'],
    ['coral-ink', 'coral-soft'],
    ['plum-ink', 'plum-soft'],
    ['violet-ink', 'violet-soft'],
    ['alert', 'bg'],
    ['alert', 'alert-soft'],
    ['map-label', 'map-base'],
  ] satisfies [ColorToken, ColorToken][])('keeps %s text on %s at 4.5:1', (text, background) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['blue-on-strong', 'surface-strong'],
    ['control-border', 'bg'],
    ['coral', 'bg'],
    ['on-strong', 'family-food'],
    ['on-strong', 'family-culture'],
    ['on-strong', 'family-nature'],
    ['on-strong', 'family-shop'],
    ['on-strong', 'family-leisure'],
    ['on-strong', 'family-other'],
  ] satisfies [ColorToken, ColorToken][])(
    'keeps the %s component on %s at 3:1',
    (ui, background) => {
      expect(contrast(ui, background)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(Object.entries(moodDots))(
    'keeps the %s mood dot at 3:1 on bg and surface',
    (_mood, dot) => {
      expect(contrast(dot, 'bg')).toBeGreaterThanOrEqual(3);
      expect(contrast(dot, 'surface')).toBeGreaterThanOrEqual(3);
    },
  );
});
