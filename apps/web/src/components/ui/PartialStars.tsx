import { filledStarsWidth } from '@/lib/ideas/display';
import { StarIcon } from '@phosphor-icons/react/ssr';
import clsx from 'clsx';

const star = 13;
const gap = 2;

/**
 * Five stars filled to the tenth of a rating (E-21 › Envies): amber over a pale grey, 13 px, 15
 * px from the tablet when `large`. Decorative: the rating is written beside them.
 */
export function PartialStars({ average, large }: { average: number; large?: boolean }) {
  const filled = (filledStarsWidth(average, star, gap) / (5 * star + 4 * gap)) * 100;
  const row = (className: string) =>
    Array.from({ length: 5 }, (_, index) => (
      <StarIcon
        key={index}
        weight="fill"
        className={clsx('size-star shrink-0', large && 'md:size-star-l', className)}
      />
    ));
  return (
    <span aria-hidden className="grid shrink-0">
      <span className="col-start-1 row-start-1 flex gap-2">{row('text-star-empty')}</span>
      <span
        className="col-start-1 row-start-1 flex gap-2 overflow-hidden"
        style={{ width: `${filled}%` }}
      >
        {row('text-amber')}
      </span>
    </span>
  );
}
