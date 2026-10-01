import { roundedPath, type Point } from '@/lib/plan-geometry';
import clsx from 'clsx';

/**
 * Line of a route on a plan, like the line of the logo (E-21): 20 px, round ends, its shadow
 * tinted blue under it. Turns rounded, except at the points of `sharp` (under the pin of a step).
 * With `animated`, it draws itself (E-21 › Mouvement), at once with « Réduire les animations ».
 * In the coordinates of the grid (`PlanLayer`).
 */
export function PlanLine({
  points,
  turn,
  sharp,
  animated,
}: {
  points: readonly Point[];
  /** Radius of the rounded turns. */
  turn: number;
  sharp?: ReadonlySet<number>;
  animated: boolean;
}) {
  const line = {
    d: roundedPath(points, turn, sharp),
    pathLength: 1,
    strokeDasharray: 1,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: clsx('fill-none', animated && 'animate-plan-draw motion-reduce:animate-none'),
  } as const;
  return (
    <>
      <path
        {...line}
        className={clsx(line.className, 'stroke-blue-ink/15')}
        strokeWidth={26}
        transform="translate(4 8)"
      />
      <path {...line} className={clsx(line.className, 'stroke-blue-soft')} strokeWidth={20} />
    </>
  );
}
