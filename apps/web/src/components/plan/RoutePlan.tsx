import type { Plan } from '@/config/example-plan';
import { planMotion } from '@/config/motion';
import { fill } from '@/lib/i18n/fill';
import { placeOnScreen, progressAt, type Point } from '@/lib/plan-geometry';
import clsx from 'clsx';
import { useId, type CSSProperties } from 'react';
import { PlanFade, type PlanFadeSide } from './PlanFade';
import { PlanHorizon } from './PlanHorizon';
import { PlanLayer } from './PlanLayer';
import { PlanLine } from './PlanLine';
import { PlanStepMarker } from './PlanStepMarker';
import { PlanStreets } from './PlanStreets';
import { PlanWalkMarker } from './PlanWalkMarker';

type Props = {
  plan: Plan;
  /** « {minutes} min à pied », in the language of the page. */
  walkText: string;
  /** Point of the frame where the origin of the grid sits, in CSS lengths (`'72%'`). */
  anchor: { x: string; y: string };
  /** Pixels from the anchor to the origin of the grid, to frame the route. */
  offset: Point;
  /**
   * Size of the drawing (streets, line, distances) against the mockup of the computer: 0.52 on
   * the phone (measured on E-21). The labels keep their size.
   */
  scale?: number;
  /**
   * Phone (E-21): short names of the steps, smaller pins, labels on the side that stays in the
   * frame, no walking times.
   */
  compact?: boolean;
  /** Walking times between the steps: on the computer only (E-21, the tablet shows none). */
  walks?: boolean;
  /**
   * Where the streets fade out (E-21): on the left, under the card, on the computer; at the top,
   * under the text, on the phone.
   */
  fade?: PlanFadeSide;
  /** Computer: the darker curve at the bottom of the frame (E-21). */
  horizon?: boolean;
  /**
   * E-21 › Mouvement: the line draws itself, each step appears when the line reaches it, then its
   * name and the walking time that leaves it. With « Réduire les animations », the line is drawn
   * at once and the rest fades in without movement.
   */
  animated?: boolean;
  /** Placement and height of the plan, given by the page: it fills its box. */
  className?: string;
};

/**
 * Blue plan with a route drawn on its streets like the line of the logo (E-21): the streets and
 * their avenues, the line, a pin and a label per step, the walking times. The streets and the
 * route share one grid, turned together, so the line always runs on a street. Drawn in pixels:
 * a wider frame shows more streets, nothing is scaled. Decorative, hidden from screen readers.
 * Built from the pieces of this folder, which draw other plans too (the missing page: a line
 * without steps).
 */
export function RoutePlan({
  plan,
  walkText,
  anchor,
  offset,
  scale = 1,
  compact = false,
  walks = !compact,
  fade,
  horizon = false,
  animated = true,
  className,
}: Props) {
  const fadeId = `${useId()}-fade`;
  const transform = `translate(${offset.x} ${offset.y}) rotate(${plan.angle}) scale(${scale})`;
  const screen = (point: Point): CSSProperties => {
    const { x, y } = placeOnScreen({ x: point.x * scale, y: point.y * scale }, plan.angle, offset);
    return { left: x, top: y };
  };
  const reachedAt = (index: number) =>
    planMotion.drawDelay + planMotion.drawDuration * progressAt(plan.points, index);

  return (
    <div aria-hidden className={clsx('pointer-events-none overflow-hidden', className)}>
      <svg className="absolute size-full">
        {fade && <PlanFade id={fadeId} side={fade} />}
        <g mask={fade ? `url(#${fadeId})` : undefined}>
          <PlanLayer anchor={anchor} transform={transform}>
            <PlanStreets street={plan.street} avenues={plan.avenues} />
          </PlanLayer>
        </g>
        {horizon && <PlanHorizon />}
        <PlanLayer anchor={anchor} transform={transform}>
          <PlanLine
            points={plan.points}
            turn={plan.turn}
            sharp={new Set(plan.steps.map((step) => step.point))}
            animated={animated}
          />
        </PlanLayer>
      </svg>

      <div className="absolute" style={{ left: anchor.x, top: anchor.y }}>
        {plan.steps.map((step) => {
          const point = plan.points[step.point];
          if (!point) return null;
          return (
            <PlanStepMarker
              key={step.name}
              step={step}
              position={screen(point)}
              appearAt={reachedAt(step.point)}
              compact={compact}
              animated={animated}
            />
          );
        })}

        {walks &&
          plan.walks.map((walk, index) => (
            <PlanWalkMarker
              key={index}
              text={fill(walkText, { minutes: walk.minutes })}
              position={screen(walk.at)}
              appearAt={reachedAt(plan.steps[walk.after]?.point ?? 0) + 2 * planMotion.followGap}
              animated={animated}
            />
          ))}
      </div>
    </div>
  );
}
