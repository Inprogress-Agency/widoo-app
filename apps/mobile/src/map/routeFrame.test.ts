import { size, spacing } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import { minRouteBand, routeFramePadding, stepDotClearance, topBarGap } from './routeFrame';

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

  it('leaves the route a step touch target when the sheet and the tooltip are both tall', () => {
    // A tall summary in the sheet: the tooltip would leave the route less than its band.
    const crowded = { ...layout, topBarHeight: 180, tooltipHeight: 242, sheetCover: 400 };
    const { top, bottom } = routeFramePadding(crowded);
    expect(top).toBe(874 - bottom - minRouteBand);
    expect(top).toBeLessThan(180 + topBarGap + 242);
    expect(top).toBeGreaterThan((874 - 83) / 2);
  });

  it('never gives the tooltip less than the upper half, however tall the sheet', () => {
    // iPhone 17 Pro at XXXL: the summary of the sheet leaves less than the band already.
    const full = { ...layout, tabBarHeight: 98, topBarHeight: 178, tooltipHeight: 242 };
    expect(routeFramePadding({ ...full, sheetCover: 435 }).top).toBe((874 - 98) / 2);
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
