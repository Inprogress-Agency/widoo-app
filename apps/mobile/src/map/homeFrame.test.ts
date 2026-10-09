import { describe, expect, it } from 'vitest';
import {
  cameraPaddingOf,
  isSamePadding,
  isSettledOn,
  minVisibleBand,
  noPadding,
  visibleZonePadding,
} from './homeFrame';
import type { Padding } from './tooltip';

// Measured on the iPhone 17 Pro at 100 % of text (#334): map, bar at the top, sheet per detent.
const iphone = { viewportHeight: 874, topBarHeight: 178 };
const atRest = { ...iphone, sheetCover: 218 };
const atHalf = { ...iphone, sheetCover: 578 };
const atFull = { ...iphone, sheetCover: 822 };

/** Where a padded camera puts its centre on the screen, from the top. */
const centreY = (viewportHeight: number, { top, bottom }: Padding) =>
  top + (viewportHeight - top - bottom) / 2;

describe('visibleZonePadding', () => {
  it('centres the camera between the bar at the top and the sheet at rest', () => {
    const padding = visibleZonePadding(atRest);
    expect(padding).toEqual({ top: 178, right: 0, bottom: 218, left: 0 });
    // Not the middle of the screen, 437, where it sat before (#334).
    expect(centreY(874, padding ?? noPadding)).toBe(417);
  });

  it('centres it above the sheet at half, never under it', () => {
    const padding = visibleZonePadding(atHalf) ?? noPadding;
    expect(centreY(874, padding)).toBe(237);
    expect(centreY(874, padding)).toBeLessThan(874 - atHalf.sheetCover);
  });

  it('follows a rest detent that grows after the camera move, around a message', () => {
    const results = visibleZonePadding({ viewportHeight: 914, topBarHeight: 140, sheetCover: 310 });
    const message = visibleZonePadding({ viewportHeight: 914, topBarHeight: 140, sheetCover: 374 });
    expect(centreY(914, message ?? noPadding) - centreY(914, results ?? noPadding)).toBe(-32);
  });

  it('follows the bar at the top as it grows with the text size', () => {
    const atLargeText = visibleZonePadding({ ...atRest, topBarHeight: 230 }) ?? noPadding;
    expect(centreY(874, atLargeText)).toBe(443);
    expect(centreY(874, atLargeText) - atLargeText.top).toBeGreaterThanOrEqual(minVisibleBand / 2);
  });

  it('gives no padding with the map under the sheet at full, nor before the layout', () => {
    expect(visibleZonePadding(atFull)).toBeNull();
    expect(visibleZonePadding({ viewportHeight: 0, topBarHeight: 0, sheetCover: 218 })).toBeNull();
  });

  it('keeps a band of one touch target at least', () => {
    const sheetCover = 874 - 178 - minVisibleBand;
    expect(visibleZonePadding({ ...iphone, sheetCover })).not.toBeNull();
    expect(visibleZonePadding({ ...iphone, sheetCover: sheetCover + 1 })).toBeNull();
  });
});

describe('cameraPaddingOf', () => {
  it('gives every side, so that none is kept from the camera before', () => {
    expect(cameraPaddingOf(noPadding)).toEqual({
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    });
  });
});

describe('isSamePadding', () => {
  it('ignores what the native map rounds', () => {
    const padding = { top: 140.19, right: 0, bottom: 208, left: 0 };
    expect(isSamePadding(padding, { ...padding, top: 140 })).toBe(true);
    expect(isSamePadding(padding, { ...padding, bottom: 374 })).toBe(false);
  });
});

describe('isSettledOn', () => {
  const home = { centerCoordinate: [2.3636, 48.8674] as [number, number], zoomLevel: 14.2 };

  it('reads the centre of the padded camera, not the centre of the zone shown', () => {
    expect(isSettledOn({ center: [2.3636, 48.8674], zoom: 14.2 }, home)).toBe(true);
    expect(isSettledOn({ center: [2.3636, 48.8654], zoom: 14.2 }, home)).toBe(false);
  });

  it('tells another zoom apart', () => {
    expect(isSettledOn({ center: [2.3636, 48.8674], zoom: 13.2 }, home)).toBe(false);
  });
});
