import clsx from 'clsx';
import { PartialStars } from './PartialStars';

/**
 * Rating of a route on its photo (E-21 › Envies): white pill, stars filled to the tenth, the
 * rating and the number of reviews, read « Noté 4,9 sur 5, 128 avis ». Larger from the tablet
 * when `large`. The caller places it and shows it only when the route has reviews.
 */
export function RatingPill({
  rating,
  large,
}: {
  rating: { average: number; value: string; reviews: string; spoken: string };
  large?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={rating.spoken}
      className={clsx(
        'flex items-center gap-6 whitespace-nowrap rounded-pill bg-bg pl-10 pr-12 shadow-rating',
        'h-rating',
        large && 'md:h-rating-l',
      )}
    >
      <PartialStars average={rating.average} large={large} />
      <span className={clsx('text-rating-value text-ink', large && 'md:text-rating-value-l')}>
        {rating.value}
      </span>
      <span className="text-label text-muted">{rating.reviews}</span>
    </span>
  );
}
