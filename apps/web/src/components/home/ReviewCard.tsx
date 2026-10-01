import type { SiteLocale } from '@/config/locales';
import { formatDaysAgo } from '@/lib/format';
import { fill } from '@/lib/i18n/fill';
import type { AppReview } from '@/lib/reviews/types';
import type { Messages } from '@/messages';
import { StarIcon } from '@phosphor-icons/react/ssr';

/**
 * A review of the app (E-21 › Avis de la hero): five stars, its store, the quote, the initial and
 * first name of its author and how old it is. Read as a quote with its author.
 */
export function ReviewCard({
  review,
  locale,
  now,
  texts,
}: {
  review: AppReview;
  locale: SiteLocale;
  now: Date;
  texts: Messages['home'];
}) {
  return (
    <figure className="flex w-review flex-col rounded-section bg-bg px-16 pb-16 pt-16 shadow-sticker">
      <div className="flex items-center justify-between">
        <span className="flex text-amber">
          <span className="sr-only">{fill(texts.ratingSpoken, { rating: review.rating })}</span>
          {Array.from({ length: 5 }, (_, index) => (
            <StarIcon
              key={index}
              aria-hidden
              weight="fill"
              className={index < review.rating ? 'size-icon-s' : 'size-icon-s text-line'}
            />
          ))}
        </span>
        <span className="text-label-strong text-muted">{texts.reviewSource[review.store]}</span>
      </div>
      <blockquote className="mt-10 text-quote text-ink">« {review.text} »</blockquote>
      <figcaption className="mt-10 flex items-center gap-8">
        <span
          aria-hidden
          className="flex size-icon-l items-center justify-center rounded-pill bg-blue-soft text-label-strong text-blue-ink"
        >
          {review.firstName.charAt(0)}
        </span>
        <span className="text-item text-ink">{review.firstName}</span>
        <span className="text-body-medium text-muted">
          {formatDaysAgo(review.date, now, locale)}
        </span>
      </figcaption>
    </figure>
  );
}
