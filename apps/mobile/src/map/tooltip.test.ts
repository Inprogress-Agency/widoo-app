import { describe, expect, it } from 'vitest';
import type { Bounds } from './geo';
import { screenPointOnFit, tooltipAnchorX, tooltipSide } from './tooltip';

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
