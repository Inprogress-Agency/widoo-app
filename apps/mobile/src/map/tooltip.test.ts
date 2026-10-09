import { describe, expect, it } from 'vitest';
import type { Bounds } from './geo';
import { cameraOnFit, screenPointOnFit, tooltipAnchorX, tooltipSide } from './tooltip';

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

describe('cameraOnFit', () => {
  const mercatorX = (lng: number) => (lng + 180) / 360;

  it('zooms so that the tighter side of the bounds fills the room left by the padding', () => {
    // A wide route: its width fills the 336 points between the side paddings.
    const bounds: Bounds = { ne: [2.4, 48.86], sw: [2.3, 48.85] };
    const camera = cameraOnFit(bounds, { width: 400, height: 800, padding });
    const worldWidth = 512 * 2 ** (camera?.zoomLevel ?? 0);
    expect(worldWidth * (mercatorX(2.4) - mercatorX(2.3))).toBeCloseTo(336, 6);
  });

  it('centres the camera on the middle of the bounds, in the projection of the map', () => {
    const bounds: Bounds = { ne: [2.35, 48.9], sw: [2.34, 48.8] };
    const camera = cameraOnFit(bounds, { width: 400, height: 800, padding });
    const [lng, lat] = camera?.centerCoordinate ?? [0, 0];
    expect(lng).toBeCloseTo(2.345, 9);
    // North of the arithmetic mean: Mercator stretches the north.
    expect(lat).toBeGreaterThan(48.85);
    expect(lat).toBeLessThan(48.851);
  });

  it('puts each step where screenPointOnFit expects it, the padding of the camera given', () => {
    const mercatorY = (lat: number) => {
      const rad = (lat * Math.PI) / 180;
      return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
    };
    const bounds: Bounds = { ne: [2.36, 48.87], sw: [2.32, 48.84] };
    const viewport = {
      width: 411,
      height: 914,
      padding: { top: 413, right: 32, bottom: 398, left: 32 },
    };
    const camera = cameraOnFit(bounds, viewport);
    const [centreLng, centreLat] = camera?.centerCoordinate ?? [0, 0];
    const worldWidth = 512 * 2 ** (camera?.zoomLevel ?? 0);
    // The map puts its centre in the middle of the padded room.
    const room = { x: 32 + (411 - 64) / 2, y: 413 + (914 - 413 - 398) / 2 };
    const step = { lat: 48.86, lng: 2.33 };
    const expected = screenPointOnFit(step, bounds, viewport);
    expect(room.x + (mercatorX(step.lng) - mercatorX(centreLng)) * worldWidth).toBeCloseTo(
      expected.x,
      6,
    );
    expect(room.y + (mercatorY(step.lat) - mercatorY(centreLat)) * worldWidth).toBeCloseTo(
      expected.y,
      6,
    );
  });

  it('gives no camera for a single point or a room without height', () => {
    const point: Bounds = { ne: [2.34, 48.86], sw: [2.34, 48.86] };
    expect(cameraOnFit(point, { width: 400, height: 800, padding })).toBeNull();
    const bounds: Bounds = { ne: [2.4, 48.86], sw: [2.3, 48.85] };
    const closed = { ...padding, top: 400, bottom: 400 };
    expect(cameraOnFit(bounds, { width: 400, height: 800, padding: closed })).toBeNull();
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
