/**
 * Order of the steps (Orchestration › Règles de cohérence, `back_and_forth`, D-049): the order by
 * nearest neighbour that « Réordonner » proposes, and whether the order of the creator lengthens
 * the path too much against it. Measured in a straight line, the same for every mode.
 */
import type { LatLng } from '@widoo/shared';
import { straightLineM } from './geo';

/** Length of the path through the points in this order, in a straight line, in meters. */
export function pathLengthM(points: readonly LatLng[], order: readonly number[]): number {
  let length = 0;
  for (let index = 1; index < order.length; index += 1) {
    const from = points[order[index - 1] ?? 0];
    const to = points[order[index] ?? 0];
    if (from && to) length += straightLineM(from, to);
  }
  return length;
}

/**
 * Positions of the points in nearest-neighbour order: the first step stays the start, then the
 * closest step not yet visited, the earlier of two as close.
 */
export function nearestNeighbourOrder(points: readonly LatLng[]): number[] {
  if (points.length === 0) return [];
  const order = [0];
  const left = new Set(points.keys());
  left.delete(0);
  while (left.size > 0) {
    const from = points[order.at(-1) ?? 0] as LatLng;
    let closest = -1;
    let closestM = Infinity;
    for (const index of left) {
      const distanceM = straightLineM(from, points[index] as LatLng);
      if (distanceM < closestM) {
        closest = index;
        closestM = distanceM;
      }
    }
    order.push(closest);
    left.delete(closest);
  }
  return order;
}

/**
 * The order « Réordonner » proposes when the order of the steps lengthens the path by more than
 * `maxExtraShare` (0.5: 50 %) over the nearest-neighbour one; null when it does not.
 */
export function reorderOf(points: readonly LatLng[], maxExtraShare: number): number[] | null {
  if (points.length < 3) return null;
  const proposed = nearestNeighbourOrder(points);
  const current = pathLengthM(
    points,
    points.map((_, index) => index),
  );
  return current > pathLengthM(points, proposed) * (1 + maxExtraShare) ? proposed : null;
}
