import { messages } from '@/messages/fr';
import type { ModerationStep } from '@widoo/shared';
import { StepItem } from './StepItem';
import { StepPlan } from './StepPlan';

/** « Carte et étapes »: the plan of the route, then its steps in order. */
export function StepList({ steps }: { steps: ModerationStep[] }) {
  return (
    <section className="flex flex-col gap-16">
      <h3 className="text-title-s">{messages.moderation.sheet.mapTitle}</h3>
      <StepPlan steps={steps} />
      <ol className="flex flex-col gap-10">
        {steps.map((step, index) => (
          <StepItem key={step.id} step={step} number={index + 1} />
        ))}
      </ol>
    </section>
  );
}
