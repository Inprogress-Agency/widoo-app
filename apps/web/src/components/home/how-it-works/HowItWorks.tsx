import { SectionHeading } from '@/components/home/SectionHeading';
import type { Messages } from '@/messages';
import { HowPath } from './HowPath';
import { HowStep, type HowStepLayout } from './HowStep';

/** Place and tilt of each step, measured in the source of the mockups (E-21). */
const layouts: readonly HowStepLayout[] = [
  { place: 'xl:left-0 xl:top-how-1-top', tilt: 'rotate-shot-1-phone md:rotate-shot-1' },
  { place: 'xl:left-how-2 xl:top-how-2-top', tilt: 'rotate-shot-2', small: true },
  { place: 'xl:left-how-3 xl:top-how-3-top', tilt: 'rotate-shot-3' },
];

/**
 * « Des balades à Paris toutes prêtes » (E-21), under the hero: three steps linked by the blue
 * path. Phone: one under the other; tablet: three columns; computer: offset along the path, in a
 * 1200 px column. The path leaves the section on both sides and runs under the next one.
 */
export function HowItWorks({ texts }: { texts: Messages['howItWorks'] }) {
  return (
    <section
      aria-labelledby="h-how"
      className="overflow-x-clip pb-48 pt-64 max-md:px-16 md:pb-88 md:pt-96 md:max-xl:px-gutter xl:pb-80 xl:pt-120"
    >
      <div className="mx-auto flex flex-col gap-36 md:gap-52 xl:max-w-section xl:gap-72">
        <SectionHeading id="h-how" title={texts.title} lead={texts.lead} />
        <div className="relative">
          <HowPath />
          <ol className="relative flex flex-col max-md:gap-48 md:grid md:grid-cols-3 md:gap-x-24 xl:block xl:h-how-steps">
            {layouts.map((layout, index) => {
              const step = texts.steps[index];
              return (
                step && (
                  <HowStep
                    key={step.title}
                    number={index + 1}
                    title={step.title}
                    text={step.text}
                    strong={'strong' in step ? step.strong : undefined}
                    layout={layout}
                    linked={index < layouts.length - 1}
                  />
                )
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
