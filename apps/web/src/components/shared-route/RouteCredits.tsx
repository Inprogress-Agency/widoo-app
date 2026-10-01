import type { SharedRouteDisplay } from '@/lib/shared-route/display';
import { StarIcon } from '@phosphor-icons/react/ssr';
import { WidooIcon } from '../ui/WidooIcon';

/** Rating and creator; a private link shows who shared it instead, without rating (E-21). */
export function RouteCredits({
  display,
  isPrivate,
  byWidoo,
}: {
  display: SharedRouteDisplay;
  isPrivate: boolean;
  byWidoo: boolean;
}) {
  if (isPrivate) {
    return (
      <p className="flex items-center gap-10 text-body text-muted">
        {display.authorInitial && (
          <span
            aria-hidden
            className="flex size-avatar-m shrink-0 items-center justify-center rounded-pill bg-blue-soft text-label-strong text-blue-ink"
          >
            {display.authorInitial}
          </span>
        )}
        {display.author}
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-12 gap-y-4">
      {display.rating && (
        <span className="flex items-center gap-6 border-r border-line pr-12">
          <StarIcon aria-hidden weight="fill" className="size-icon-m text-amber" />
          <span className="sr-only">{display.rating.spoken}</span>
          <span aria-hidden className="text-item text-ink">
            {display.rating.value}
          </span>
          <span aria-hidden className="text-body-medium text-muted">
            {display.rating.reviews}
          </span>
        </span>
      )}
      <span className="flex items-center gap-8 text-body-medium text-ink">
        {byWidoo && <WidooIcon className="size-avatar-s" />}
        {display.author}
      </span>
    </p>
  );
}
