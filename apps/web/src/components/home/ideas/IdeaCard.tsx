import { RatingPill } from '@/components/ui/RatingPill';
import type { ExampleRouteDisplay } from '@/lib/ideas/display';
import clsx from 'clsx';
import { ExampleRouteLink } from './ExampleRouteLink';
import { PhotoSticker } from './PhotoSticker';

export type IdeaCardLayout = {
  /** Place of the card in the grid of the tablet and of the computer. */
  place: string;
  tilt: string;
  /** Height of its photo. */
  photo: string;
  /** The first card: larger title, text and rating from the tablet. */
  large?: boolean;
};

/**
 * A mood of « Des idées de sortie pour chaque envie » (E-21): its photo sticker with the rating of
 * its example route, its title, its text and the example route. Without example route, the photo
 * and the text only; without reviews, no rating.
 */
export function IdeaCard({
  title,
  text,
  route,
  layout,
}: {
  title: string;
  text: string;
  route?: { href: string; display: ExampleRouteDisplay };
  layout: IdeaCardLayout;
}) {
  const rating = route?.display.rating;
  return (
    <article className={clsx('flex flex-col gap-18 md:gap-20 xl:gap-22', layout.place)}>
      <PhotoSticker tilt={layout.tilt} photo={layout.photo}>
        {rating && (
          <span
            className={clsx(
              'absolute bottom-18 left-18',
              layout.large && 'md:bottom-20 md:left-20',
            )}
          >
            <RatingPill rating={rating} large={layout.large} />
          </span>
        )}
      </PhotoSticker>
      <div className="flex flex-col gap-6 md:gap-8 md:px-4">
        <h3
          className={clsx(
            'text-title-l text-ink',
            layout.large && 'md:text-title-xl xl:text-idea-title-xl',
          )}
        >
          {title}
        </h3>
        <p className={clsx('text-lead text-muted', layout.large && 'xl:text-lead-m')}>{text}</p>
        {route && <ExampleRouteLink href={route.href} route={route.display} />}
      </div>
    </article>
  );
}
