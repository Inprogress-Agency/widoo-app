import { size, spacing } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import {
  leastRouteBand,
  minRouteBand,
  routeFramePadding,
  stepDotClearance,
  topBarGap,
} from './routeFrame';

// iPhone 17 Pro at 100 % of text: status bar, search pill and chips, and the start tooltip.
const layout = {
  viewportHeight: 874,
  tabBarHeight: 83,
  sheetCover: 203,
  topBarHeight: 170,
  tooltipHeight: 180,
};

describe('routeFramePadding', () => {
  it('keeps the room of the sheet plus the radius of an active step dot at the bottom', () => {
    const { bottom } = routeFramePadding(layout);
    expect(bottom).toBe(layout.sheetCover + size['step-dot-active'] / 2);
    expect(bottom - layout.sheetCover).toBeGreaterThan(size['step-dot'] / 2);
  });

  it('follows the height of the sheet as it settles around the summary', () => {
    const atRest = routeFramePadding(layout);
    const taller = routeFramePadding({ ...layout, sheetCover: 260 });
    expect(taller.bottom - atRest.bottom).toBe(57);
  });

  it('leaves the upper half of the map, above the tab bar, to the tooltip when it fits', () => {
    expect(routeFramePadding(layout).top).toBe((874 - 83) / 2);
  });

  it('keeps the tooltip of the highest step under the bar at the top, as measured', () => {
    const tall = { ...layout, topBarHeight: 180, tooltipHeight: 230 };
    const { top } = routeFramePadding(tall);
    expect(top).toBe(180 + topBarGap + 230);
    // The tooltip hangs from the highest step, on the top edge of the framed zone.
    expect(top - tall.tooltipHeight).toBeGreaterThanOrEqual(tall.topBarHeight);
  });

  it('follows the bar as it grows with the text size, without a fixed height', () => {
    const atLargeText = { ...layout, topBarHeight: 230, tooltipHeight: 200 };
    const larger = { ...atLargeText, topBarHeight: 260 };
    expect(routeFramePadding(larger).top - routeFramePadding(atLargeText).top).toBe(30);
  });

  it('keeps the gap of a tooltip to the edges of the screen under the bar', () => {
    expect(topBarGap).toBe(spacing['space-16']);
  });

  it('keeps the tooltip under the bar when the sheet and the tooltip are both tall', () => {
    // A tall summary in the sheet: the route keeps what the bar and the tooltip leave it.
    const crowded = { ...layout, topBarHeight: 180, tooltipHeight: 242, sheetCover: 350 };
    const { top, bottom } = routeFramePadding(crowded);
    expect(top).toBe(180 + topBarGap + 242);
    expect(bottom).toBe(350 + stepDotClearance);
    // The highest step, its tooltip hanging over it, stays under the bar.
    expect(top - crowded.tooltipHeight).toBeGreaterThanOrEqual(crowded.topBarHeight);
    expect(874 - top - bottom).toBeGreaterThanOrEqual(minRouteBand);
  });

  it('gives the upper half up to the route before its band, the bar never', () => {
    // Redmi Note 9 at the largest text: the upper half would leave the route under its band.
    const note9 = {
      viewportHeight: 851,
      tabBarHeight: 64,
      sheetCover: 413,
      topBarHeight: 150,
      tooltipHeight: 200,
    };
    const { top, bottom } = routeFramePadding(note9);
    expect(top).toBe(851 - bottom - minRouteBand);
    expect(top).toBeLessThan((851 - 64) / 2);
    expect(top).toBeGreaterThanOrEqual(150 + topBarGap + 200);
  });

  it('frames the route in the band left, however narrow, above the sheet', () => {
    // iPhone 17 Pro at XXXL, as measured: 16 points left between the tooltip and the summary.
    const full = { ...layout, tabBarHeight: 98, topBarHeight: 178, tooltipHeight: 212 };
    const { top, bottom } = routeFramePadding({ ...full, sheetCover: 435 });
    expect(top).toBe(178 + topBarGap + 212);
    expect(bottom).toBe(435 + stepDotClearance);
    expect(874 - top - bottom).toBe(16);
  });

  it('lets the sheet cover the foot of the route only when no band is left', () => {
    const full = { ...layout, tabBarHeight: 98, topBarHeight: 178, tooltipHeight: 242 };
    const { top, bottom } = routeFramePadding({ ...full, sheetCover: 435 });
    expect(top).toBe(178 + topBarGap + 242);
    expect(874 - top - bottom).toBe(leastRouteBand);
  });

  it('keeps the upper half before the tooltip and the bar are laid out', () => {
    const unmeasured = { ...layout, topBarHeight: 0, tooltipHeight: 0 };
    expect(routeFramePadding(unmeasured).top).toBe((874 - 83) / 2);
  });

  it('keeps a step dot at the side of the screen whole, active size included', () => {
    const { left, right } = routeFramePadding(layout);
    expect(left).toBe(spacing['space-32']);
    expect(right).toBe(spacing['space-32']);
    expect(left).toBeGreaterThanOrEqual(stepDotClearance);
  });
});
