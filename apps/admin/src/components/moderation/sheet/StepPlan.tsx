import { layOutSteps, planSize } from '@/lib/step-plan';
import { messages } from '@/messages/fr';
import type { ModerationStep } from '@widoo/shared';

/**
 * Plan of the steps of a route: its line and its numbered steps on warm gray, to read its shape
 * and its order at a glance. The list under it says the same for screen readers.
 */
export function StepPlan({ steps }: { steps: ModerationStep[] }) {
  const points = layOutSteps(steps.map((step) => step.place.location));
  return (
    <svg
      role="img"
      aria-label={messages.moderation.sheet.mapLabel(steps.length)}
      viewBox={`0 0 ${planSize.width} ${planSize.height}`}
      className="w-full rounded-photo bg-secondary"
    >
      <polyline
        points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
        className="fill-none stroke-blue"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map(({ x, y }, index) => (
        <g key={steps[index]?.id}>
          <circle cx={x} cy={y} r={13} className="fill-blue-ink stroke-bg" strokeWidth={3} />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-on-blue text-number-s"
          >
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
