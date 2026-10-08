import { size, spacing } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import { routeFramePadding, stepDotClearance } from './routeFrame';

const layout = { viewportHeight: 874, tabBarHeight: 83, sheetCover: 203 };

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

  it('leaves the upper half of the map, above the tab bar, to the tooltip', () => {
    expect(routeFramePadding(layout).top).toBe((874 - 83) / 2);
  });

  it('keeps a step dot at the side of the screen whole, active size included', () => {
    const { left, right } = routeFramePadding(layout);
    expect(left).toBe(spacing['space-32']);
    expect(right).toBe(spacing['space-32']);
    expect(left).toBeGreaterThanOrEqual(stepDotClearance);
  });
});
