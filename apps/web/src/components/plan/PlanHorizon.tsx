/**
 * Darker curve at the bottom right of a plan (E-21, measured on the mockup of the computer):
 * 40 px high at its top, from the middle of the plan to the right edge. Opaque, over the streets
 * and under the route: the plain blue hides the streets, the ink on top darkens it. Drawn inside
 * the `<svg>` of the plan.
 */
export function PlanHorizon() {
  const curve = { cx: -176, cy: 196, rx: 530, ry: 236 };
  return (
    <svg x="100%" y="100%" overflow="visible">
      <ellipse {...curve} className="fill-blue" />
      <ellipse {...curve} className="fill-blue-ink/45" />
    </svg>
  );
}
