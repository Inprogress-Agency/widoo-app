import { QuestionIcon } from '@phosphor-icons/react/ssr';
import clsx from 'clsx';

/**
 * Where a route stops short on the plan of the missing page (E-21, D-074): a white disc with a
 * question mark, the size of a step pin with its border.
 */
export function UnknownPin({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        // Same box and border as StepPin, all white.
        'box-content flex items-center justify-center rounded-pill border-bg bg-bg text-ink',
        small ? 'size-icon-l border-2' : 'size-step-dot-active border-pin',
      )}
    >
      {/* Measured on E-21: a 19 px question mark (12.5 px on the phone), 2 px stroke. */}
      <QuestionIcon weight="bold" className={small ? 'size-icon-s' : 'size-icon-l'} />
    </span>
  );
}
