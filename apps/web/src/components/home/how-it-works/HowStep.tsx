import { PhoneShot } from '@/components/ui/PhoneShot';
import clsx from 'clsx';
import { StepNumber } from './StepNumber';

export type HowStepLayout = {
  /** Place of the step on the computer, in the column of the section. */
  place: string;
  /** Tilt of its screenshot. */
  tilt: string;
  /** The second screenshot of the computer is smaller. */
  small?: boolean;
};

/**
 * A step of « Comment ça marche » (E-21): its number, its title, its text and a screenshot of the
 * app. Phone: the number on the left, a line down to the next one (`linked`), the rest beside it.
 * Tablet: a column of the grid, its text as high as the others so that the screenshots line up.
 * Computer: placed on the path (`layout.place`). `{strong}` in the text marks the passage in ink
 * and bold.
 */
export function HowStep({
  number,
  title,
  text,
  strong,
  layout,
  linked,
}: {
  number: number;
  title: string;
  text: string;
  strong?: string;
  layout: HowStepLayout;
  linked: boolean;
}) {
  const [before, after] = text.split('{strong}');
  return (
    <li
      className={clsx(
        'relative flex gap-18 md:flex-col md:gap-20 xl:absolute xl:w-how-step xl:gap-22',
        layout.place,
      )}
    >
      {linked && (
        <span
          aria-hidden
          className="absolute left-how-bar top-22 h-how-bar w-6 rounded-pill bg-blue md:hidden"
        />
      )}
      <StepNumber value={number} />
      <div className="flex flex-col gap-18 pt-8 md:contents">
        <div className="flex flex-col gap-6 md:gap-8 md:max-xl:min-h-how-text-tablet xl:max-w-how-text">
          <h3 className="text-step-title text-ink xl:text-step-title-xl">{title}</h3>
          <p className="text-lead text-muted xl:text-lead-m">
            {before}
            {strong && after !== undefined && (
              <>
                <strong className="font-bold text-ink">{strong}</strong>
                {after}
              </>
            )}
          </p>
        </div>
        <div className="max-md:pb-8 max-md:pl-24 max-md:pt-4 md:pl-8 xl:pl-36">
          <PhoneShot tilt={layout.tilt} small={layout.small} />
        </div>
      </div>
    </li>
  );
}
