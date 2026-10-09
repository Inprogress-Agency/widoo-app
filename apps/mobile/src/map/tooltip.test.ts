import { mapTooltip, size } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import type { Bounds } from './geo';
import {
  screenPointOnFit,
  tooltipAnchorX,
  tooltipPlacement,
  tooltipSide,
  tooltipWidth,
} from './tooltip';

const padding = { top: 300, right: 32, bottom: 120, left: 32 };

describe('screenPointOnFit', () => {
  it('puts the west and east edges of a wide route on the padding', () => {
    const bounds: Bounds = { ne: [2.4, 48.86], sw: [2.3, 48.85] };
    const viewport = { width: 400, height: 800, padding };
    expect(screenPointOnFit({ lat: 48.85, lng: 2.3 }, bounds, viewport).x).toBeCloseTo(32, 6);
    expect(screenPointOnFit({ lat: 48.86, lng: 2.4 }, bounds, viewport).x).toBeCloseTo(368, 6);
  });

  it('centres a tall route horizontally, its height setting the scale', () => {
    const bounds: Bounds = { ne: [2.35, 48.9], sw: [2.34, 48.8] };
    const viewport = { width: 400, height: 800, padding };
    const west = screenPointOnFit({ lat: 48.8, lng: 2.34 }, bounds, viewport).x;
    const east = screenPointOnFit({ lat: 48.9, lng: 2.35 }, bounds, viewport).x;
    expect((west + east) / 2).toBeCloseTo(200, 6);
    expect(east - west).toBeLessThan(336);
  });

  it('puts the north and south edges of a tall route on the padding', () => {
    const bounds: Bounds = { ne: [2.35, 48.9], sw: [2.34, 48.8] };
    const viewport = { width: 400, height: 800, padding };
    expect(screenPointOnFit({ lat: 48.9, lng: 2.35 }, bounds, viewport).y).toBeCloseTo(300, 6);
    expect(screenPointOnFit({ lat: 48.8, lng: 2.34 }, bounds, viewport).y).toBeCloseTo(680, 6);
  });

  it('centres a single point in the room left by the padding', () => {
    const bounds: Bounds = { ne: [2.34, 48.86], sw: [2.34, 48.86] };
    const viewport = { width: 400, height: 800, padding };
    expect(screenPointOnFit({ lat: 48.86, lng: 2.34 }, bounds, viewport)).toEqual({
      x: 200,
      y: 490,
    });
  });
});

describe('tooltipWidth', () => {
  // iPhone of the wiki, 390 wide: 312 at most (D-041).
  const at = { screenWidth: 390, padding: 16, isLargeText: false };

  it('takes the width of its title row on one line, its padding included', () => {
    // « Montmartre sans les touristes » holds on one line at 288 (D-041).
    expect(tooltipWidth(256, at)).toBe(288);
  });

  it('never goes under its minimum width, a short title centred in it', () => {
    expect(size[mapTooltip.minWidth]).toBe(260);
    expect(tooltipWidth(120, at)).toBe(260);
  });

  it('stops at 80 % of the screen, the title wrapping beyond', () => {
    expect(tooltipWidth(400, at)).toBe(312);
    expect(tooltipWidth(400, { ...at, screenWidth: 412 })).toBe(329);
  });

  it('rounds up, so that a title a fraction too wide does not wrap', () => {
    expect(tooltipWidth(250.3, at)).toBe(283);
  });

  it('takes its widest at large text, measured or not', () => {
    expect(tooltipWidth(null, { ...at, isLargeText: true })).toBe(312);
    expect(tooltipWidth(120, { ...at, isLargeText: true })).toBe(312);
  });

  it('waits for its title to be measured otherwise', () => {
    expect(tooltipWidth(null, at)).toBeNull();
  });

  it('keeps its minimum width on a screen too narrow for it', () => {
    expect(tooltipWidth(400, { ...at, screenWidth: 300 })).toBe(260);
  });
});

describe('tooltipPlacement', () => {
  const layout = { screenWidth: 400, height: 180, dotRadius: 14, roomBottom: 700 };

  it('keeps a wide tooltip on screen, its arrow on the step', () => {
    const { anchor } = tooltipPlacement({ x: 360, y: 400 }, [], { ...layout, width: 320 });
    // Its right edge 16 from the screen edge, its left edge on screen.
    expect(360 + (1 - anchor) * 320).toBeCloseTo(400 - mapTooltip.screenMarginPx, 6);
    expect(360 - anchor * 320).toBeGreaterThanOrEqual(0);
  });

  it('passes below its step when, at its width, it would cover another one above', () => {
    // 150 left of the step: under a tooltip 320 wide centred on it, beyond one 260 wide.
    const other = { x: 50, y: 330 };
    const step = { x: 200, y: 400 };
    expect(tooltipPlacement(step, [other], { ...layout, width: 320 }).side).toBe('below');
    expect(tooltipPlacement(step, [other], { ...layout, width: 260 }).side).toBe('above');
  });
});

describe('tooltipAnchorX', () => {
  const layout = { screenWidth: 400, tooltipWidth: 260, margin: 16 };

  it('centres the tooltip on a point in the middle of the screen', () => {
    expect(tooltipAnchorX(200, layout)).toBe(0.5);
  });

  it('keeps the tooltip on screen near an edge, its arrow on the point', () => {
    const nearRight = tooltipAnchorX(360, layout);
    expect(360 - nearRight * 260 + 260).toBeCloseTo(384, 6);
    const nearLeft = tooltipAnchorX(40, layout);
    expect(40 - nearLeft * 260).toBeCloseTo(16, 6);
  });
});

describe('tooltipSide', () => {
  // A tooltip 260 wide and 180 high, centred on its step, the sheet from 700 down.
  const layout = { width: 260, height: 180, anchor: 0.5, dotRadius: 14, roomBottom: 700 };
  const step = { x: 200, y: 400 };

  it('hangs above its step when nothing is above it', () => {
    expect(tooltipSide(step, [{ x: 200, y: 450 }], layout)).toBe('above');
  });

  it('hangs above a step without neighbour', () => {
    expect(tooltipSide(step, [], layout)).toBe('above');
  });

  it('passes below when above it would cover another step', () => {
    expect(tooltipSide(step, [{ x: 240, y: 330 }], layout)).toBe('below');
  });

  it('passes below when above it would cover the edge of a dot', () => {
    // The dot centre is 10 points right of the tooltip, its rim inside.
    expect(tooltipSide(step, [{ x: 340, y: 300 }], layout)).toBe('below');
    expect(tooltipSide(step, [{ x: 345, y: 300 }], layout)).toBe('above');
  });

  it('follows the tooltip slid sideways by its anchor', () => {
    const slid = { ...layout, anchor: 0.1 };
    expect(tooltipSide(step, [{ x: 100, y: 300 }], slid)).toBe('above');
    expect(tooltipSide(step, [{ x: 400, y: 300 }], slid)).toBe('below');
  });

  it('stays above when below would cover a step too, issue 335', () => {
    expect(
      tooltipSide(
        step,
        [
          { x: 200, y: 300 },
          { x: 200, y: 500 },
        ],
        layout,
      ),
    ).toBe('above');
  });

  it('stays above when below would reach under the sheet', () => {
    expect(tooltipSide({ x: 200, y: 600 }, [{ x: 200, y: 500 }], layout)).toBe('above');
  });
});
