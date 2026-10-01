import type { SiteLocale } from '@/config/locales';
import { heroMotion } from '@/config/motion';
import type { AppReview } from '@/lib/reviews/types';
import type { Messages } from '@/messages';
import clsx from 'clsx';
import { ReviewCard } from './ReviewCard';

/**
 * The review of the hero (E-21): the card tilted on the plan, a second paler card behind it, tilted
 * the other way. Comes in at 2.45 s (E-21 › Mouvement). Nothing without a real review.
 */
export function ReviewStack({
  reviews,
  locale,
  now,
  texts,
  tilt = 'rotate-review',
}: {
  reviews: AppReview[];
  locale: SiteLocale;
  now: Date;
  texts: Messages['home'];
  /** The phone tilts it less (measured on E-21). */
  tilt?: 'rotate-review' | 'rotate-review-phone';
}) {
  const [review] = reviews;
  if (!review) return null;
  return (
    <section
      aria-label={texts.reviews}
      className="relative animate-rise motion-reduce:animate-plan-fade"
      style={{ animationDelay: `${heroMotion.reviewsAt}ms` }}
    >
      <div
        aria-hidden
        className="absolute size-full translate-x-16 translate-y-16 rotate-review-back rounded-section bg-bg/40"
      />
      <div className={clsx('relative', tilt)}>
        <ReviewCard review={review} locale={locale} now={now} texts={texts} />
      </div>
    </section>
  );
}
