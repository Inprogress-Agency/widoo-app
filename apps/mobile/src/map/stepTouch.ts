import { size } from '@widoo/tokens';
import type { ScreenPoint } from './tooltip';

/**
 * The step a finger touches on the selected route (D-084): among the steps whose touch target,
 * `target` points square around the dot centre, holds the finger, the one whose centre is
 * closest to it, never the one drawn on top. Null when no target holds it.
 */
export function nearestStep(
  touch: ScreenPoint,
  steps: readonly ScreenPoint[],
  target: number = size['touch-min'],
): number | null {
  const half = target / 2;
  let nearest: number | null = null;
  let nearestDistance = Infinity;
  steps.forEach((step, index) => {
    const dx = touch.x - step.x;
    const dy = touch.y - step.y;
    const distance = dx * dx + dy * dy;
    if (Math.abs(dx) <= half && Math.abs(dy) <= half && distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  return nearest;
}
