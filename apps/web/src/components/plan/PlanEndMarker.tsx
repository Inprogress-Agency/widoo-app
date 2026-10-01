import type { CSSProperties, ReactNode } from 'react';
import { Appear } from './Appear';

/** A marker centred on the last point of the line, appearing at `appearAt` ms. */
export function PlanEndMarker({
  position,
  appearAt,
  animated,
  children,
}: {
  /** `left` and `top` of the point on the screen. */
  position: CSSProperties;
  appearAt: number;
  animated: boolean;
  children: ReactNode;
}) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={position}>
      <Appear animated={animated} delay={appearAt}>
        {children}
      </Appear>
    </div>
  );
}
