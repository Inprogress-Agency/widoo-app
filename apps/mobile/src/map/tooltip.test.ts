import { describe, expect, it } from 'vitest';
import type { Bounds } from './geo';
import { screenXOnFit, tooltipAnchorX } from './tooltip';

const padding = { top: 300, right: 32, bottom: 120, left: 32 };

describe('screenXOnFit', () => {
  it('puts the west and east edges of a wide route on the padding', () => {
    const bounds: Bounds = { ne: [2.4, 48.86], sw: [2.3, 48.85] };
    const viewport = { width: 400, height: 800, padding };
    expect(screenXOnFit({ lat: 48.85, lng: 2.3 }, bounds, viewport)).toBeCloseTo(32, 6);
    expect(screenXOnFit({ lat: 48.86, lng: 2.4 }, bounds, viewport)).toBeCloseTo(368, 6);
  });

  it('centres a tall route horizontally, its height setting the scale', () => {
    const bounds: Bounds = { ne: [2.35, 48.9], sw: [2.34, 48.8] };
    const viewport = { width: 400, height: 800, padding };
    const west = screenXOnFit({ lat: 48.8, lng: 2.34 }, bounds, viewport);
    const east = screenXOnFit({ lat: 48.9, lng: 2.35 }, bounds, viewport);
    expect((west + east) / 2).toBeCloseTo(200, 6);
    expect(east - west).toBeLessThan(336);
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
