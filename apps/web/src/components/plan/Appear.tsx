import type { ReactNode } from 'react';

/**
 * Pops in at `delay` ms (E-21 › Mouvement: scale 0.9 to 1 and opacity); fades in without movement
 * with « Réduire les animations ». Shown as is when `animated` is false.
 */
export function Appear({
  animated,
  delay,
  children,
}: {
  animated: boolean;
  delay: number;
  children: ReactNode;
}) {
  if (!animated) return children;
  return (
    <div
      className="animate-plan-pop motion-reduce:animate-plan-fade"
      style={{ animationDelay: `${Math.round(delay)}ms` }}
    >
      {children}
    </div>
  );
}
