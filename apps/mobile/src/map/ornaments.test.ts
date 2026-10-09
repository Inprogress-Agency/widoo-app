import { size } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import { mapOverlayLayout, ornamentMargin } from './ornaments';

// iPhone 17 Pro: 874 points high, status bar 62, top bar down to 176, tab bar and rest detent
// 218, half at 296.
const screen = {
  viewportHeight: 874,
  topInset: 62,
  topBarBottom: 176,
  restCover: 218,
  safeBottom: 34,
};
const rest = mapOverlayLayout({ ...screen, sheetCover: 218 });
const half = mapOverlayLayout({ ...screen, sheetCover: 874 - 296 });
const full = mapOverlayLayout({ ...screen, sheetCover: 874 - 62 });

/** Bottom and top of the attribution button, from the foot of the map. */
const attribution = (ornamentBottom: number) => {
  const bottom = ornamentBottom + screen.safeBottom;
  return { bottom, top: bottom + size['touch-min'] };
};

describe('mapOverlayLayout', () => {
  it('puts the ornaments just above the sheet at rest', () => {
    expect(attribution(rest.ornamentBottom).bottom).toBe(218 + ornamentMargin);
  });

  it('keeps the controls clear of the touch target of the attribution', () => {
    expect(rest.controlsBottom).not.toBeNull();
    expect(rest.controlsBottom).toBeGreaterThan(attribution(rest.ornamentBottom).top);
  });

  it('follows the sheet at half, the ornaments in sight above it, the controls hidden', () => {
    const { bottom, top } = attribution(half.ornamentBottom);
    expect(bottom).toBe(874 - 296 + ornamentMargin);
    expect(top).toBeLessThanOrEqual(874 - 62);
    expect(half.controlsBottom).toBeNull();
  });

  it('leaves the ornaments at rest when the sheet covers the map', () => {
    expect(full.ornamentBottom).toBe(rest.ornamentBottom);
    expect(full.controlsBottom).toBeNull();
  });

  it('keeps the controls over an empty zone whose message raises the sheet past half the map', () => {
    // At 150 % text, the message of an empty zone sets the rest detent 410 points from the top.
    const layout = mapOverlayLayout({ ...screen, topBarBottom: 210, sheetCover: 874 - 410 });
    expect(layout.controlsBottom).not.toBeNull();
    expect((layout.controlsBottom ?? 0) + size['touch-min']).toBeLessThanOrEqual(874 - 210);
  });

  it('hides the controls when no row of them fits under the top bar', () => {
    const layout = mapOverlayLayout({ ...screen, topBarBottom: 330, sheetCover: 874 - 410 });
    expect(layout.controlsBottom).toBeNull();
  });

  it('counts from the edge of the view without a safe area, as on Android', () => {
    const layout = mapOverlayLayout({ ...screen, safeBottom: 0, sheetCover: 300 });
    expect(layout.ornamentBottom).toBe(300 + ornamentMargin);
  });

  it('waits at rest before the map is laid out', () => {
    const layout = mapOverlayLayout({ ...screen, viewportHeight: 0, sheetCover: 218 });
    expect(layout.ornamentBottom).toBe(rest.ornamentBottom);
    expect(layout.controlsBottom).toBeNull();
  });
});
