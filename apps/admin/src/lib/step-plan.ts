export type PlanPoint = { lat: number; lng: number };

/** Size of the plan, in the units of its SVG: 2.5 times as wide as high, as on the sheet. */
export const planSize = { width: 600, height: 240 };
const margin = 28;

/**
 * Places the steps of a route on a small plan: longitudes from left to right, latitudes from
 * bottom to top, the whole route centered with a margin. A plan to read the shape and the order
 * of a route, not a map: no background, no scale. Longitudes are narrowed by the latitude so
 * that the shape is not stretched.
 */
export function layOutSteps(points: readonly PlanPoint[]): { x: number; y: number }[] {
  if (points.length === 0) {
    return [];
  }
  const meanLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const narrowing = Math.cos((meanLat * Math.PI) / 180);
  const xs = points.map((point) => point.lng * narrowing);
  const ys = points.map((point) => -point.lat);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const usable = { width: planSize.width - 2 * margin, height: planSize.height - 2 * margin };
  // One scale for both axes; a route with a single place, or in a straight line, is centered.
  const scale = Math.min(
    usable.width / Math.max(maxX - minX, 1e-9),
    usable.height / Math.max(maxY - minY, 1e-9),
  );
  const offset = {
    x: (planSize.width - (maxX - minX) * scale) / 2,
    y: (planSize.height - (maxY - minY) * scale) / 2,
  };
  return xs.map((x, index) => ({
    x: Math.round((x - minX) * scale + offset.x),
    y: Math.round(((ys[index] ?? minY) - minY) * scale + offset.y),
  }));
}
