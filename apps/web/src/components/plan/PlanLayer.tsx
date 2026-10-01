import type { ReactNode } from 'react';

/**
 * Drawing in the coordinates of the grid of a plan: its origin at `anchor` (CSS lengths, `'74%'`),
 * then moved, turned and scaled by `transform`. Inside the `<svg>` of the plan.
 */
export function PlanLayer({
  anchor,
  transform,
  children,
}: {
  anchor: { x: string; y: string };
  transform: string;
  children: ReactNode;
}) {
  return (
    <svg x={anchor.x} y={anchor.y} overflow="visible">
      <g transform={transform}>{children}</g>
    </svg>
  );
}
