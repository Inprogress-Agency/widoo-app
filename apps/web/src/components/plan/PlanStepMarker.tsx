import type { PlanStep } from '@/config/example-plan';
import { planMotion } from '@/config/motion';
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { StepPin } from '../ui/StepPin';
import { Appear } from './Appear';
import { StepLabel } from './StepLabel';

/**
 * A step on a plan: its pin centred on the line, its label beside it on the side the plan gives.
 * The pin appears at `appearAt` ms, the label just after (E-21 › Mouvement).
 */
export function PlanStepMarker({
  step,
  position,
  appearAt,
  compact,
  animated,
}: {
  step: PlanStep;
  /** `left` and `top` of the step on the screen. */
  position: CSSProperties;
  appearAt: number;
  /** Phone (E-21): short name, smaller pin, label on the side that stays in the frame. */
  compact: boolean;
  animated: boolean;
}) {
  return (
    <div className="absolute" style={position}>
      <div className="absolute -translate-x-1/2 -translate-y-1/2">
        <Appear animated={animated} delay={appearAt}>
          <StepPin category={step.category} small={compact} />
        </Appear>
      </div>
      <div className={clsx('absolute -translate-y-1/2', labelSide(step, compact))}>
        <Appear animated={animated} delay={appearAt + planMotion.followGap}>
          <StepLabel
            time={step.time}
            name={compact ? (step.shortName ?? step.name) : step.name}
            locked={step.locked}
          />
        </Appear>
      </div>
    </div>
  );
}

/** Places the label of a step beside its pin, on the side the plan gives for the screen. */
function labelSide({ side, phoneSide = side }: PlanStep, compact: boolean): string {
  if (compact) return phoneSide === 'right' ? 'left-20' : 'right-20';
  return side === 'right' ? 'left-28' : 'right-28';
}
