import type { CSSProperties } from 'react';
import { Appear } from './Appear';
import { WalkPill } from './WalkPill';

/** Walking time on the line of a plan, centred on its point, appearing at `appearAt` ms. */
export function PlanWalkMarker({
  text,
  position,
  appearAt,
  animated,
}: {
  text: string;
  /** `left` and `top` of the point on the screen. */
  position: CSSProperties;
  appearAt: number;
  animated: boolean;
}) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={position}>
      <Appear animated={animated} delay={appearAt}>
        <WalkPill text={text} />
      </Appear>
    </div>
  );
}
