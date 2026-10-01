import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { Point } from '@/lib/plan-geometry';

/**
 * Something laid on a plan (a card, a sticker), centred at `offset` pixels from the anchor of the
 * plan, so that it keeps its place on the route whatever the width of the frame.
 */
export function PlanOverlay({
  anchor,
  offset,
  className,
  children,
}: {
  anchor: { x: string; y: string };
  offset: Point;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute" style={{ left: anchor.x, top: anchor.y }}>
      <div
        className={clsx('absolute -translate-x-1/2 -translate-y-1/2', className)}
        style={{ left: offset.x, top: offset.y }}
      >
        {children}
      </div>
    </div>
  );
}
