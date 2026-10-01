import { fill } from '@/lib/i18n/fill';
import type { SharedRouteDisplay } from '@/lib/shared-route/display';
import type { SharedRoute } from '@/lib/shared-route/types';
import type { Messages } from '@/messages';
import { ClockIcon, FlagIcon, PersonSimpleWalkIcon, WalletIcon } from '@phosphor-icons/react/ssr';
import { Badge } from '../ui/Badge';
import { KeyFact } from '../ui/KeyFact';
import { KeyFigureTile } from '../ui/KeyFigureTile';
import { PremiumNote } from './PremiumNote';
import { RouteCredits } from './RouteCredits';

type Props = {
  route: SharedRoute;
  display: SharedRouteDisplay;
  isPrivate: boolean;
  texts: Messages['sharedRoute'];
};

/**
 * Card of a shared route (E-21): photo, title, mood and place, rating and creator, duration,
 * budget, distance and number of steps, never the steps themselves. Stacked on the phone,
 * horizontal from the tablet, with tiles for the key figures; the photo then fills the height of
 * the card. A Premium route adds its badge on the photo and, at the bottom, how to open it.
 */
export function SharedRouteCard({ route, display, isPrivate, texts }: Props) {
  const isPremium = route.access === 'premium';
  return (
    <article className="flex flex-col gap-16 rounded-sheet bg-bg p-8 md:flex-row md:gap-12 xl:gap-10">
      <div className="relative md:w-full md:max-w-shared-photo-tablet md:shrink-0 xl:max-w-shared-photo">
        {route.coverUrl ? (
          // Photos of the API, host fixed by #36: next/image once its address is known.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={route.coverUrl}
            alt={fill(texts.photoLabel, { title: route.title })}
            className="aspect-video size-full rounded-section object-cover md:aspect-auto"
          />
        ) : (
          <div
            aria-hidden
            className="aspect-video rounded-section bg-blue-soft md:aspect-auto md:h-full"
          />
        )}
        {isPrivate && (
          <Badge kind="private" label={texts.private} className="absolute left-12 top-12" />
        )}
        {isPremium && (
          // Read after the title instead.
          <Badge
            kind="premium"
            label={texts.premium}
            hidden
            className="absolute bottom-10 left-10"
          />
        )}
      </div>

      <div className="flex flex-col gap-12 max-md:px-12 md:flex-1 max-md:pb-16 md:justify-center md:py-8 md:pr-16 xl:pr-12">
        <div className="flex flex-col gap-4">
          <h1 className="text-title-xl text-ink md:text-title-l">{route.title}</h1>
          {isPremium && <p className="sr-only">{texts.premium}</p>}
          {display.place && <p className="text-body-medium text-muted">{display.place}</p>}
        </div>

        {/* Phone: one line of key figures. */}
        <ul className="flex flex-wrap gap-x-20 gap-y-8 md:hidden">
          <KeyFact Icon={ClockIcon} text={display.duration} />
          <KeyFact Icon={WalletIcon} text={display.budget.text} spoken={display.budget.spoken} />
          <KeyFact Icon={FlagIcon} text={display.steps.text} />
        </ul>

        <RouteCredits
          byWidoo={route.author.kind === 'widoo'}
          display={display}
          isPrivate={isPrivate}
        />

        {/* Tablet and computer: four tiles. */}
        <ul className="hidden grid-cols-4 gap-6 md:grid">
          <KeyFigureTile Icon={ClockIcon} value={display.duration} label={texts.tiles.duration} />
          <KeyFigureTile
            Icon={WalletIcon}
            value={display.budget.text}
            spoken={display.budget.spoken}
            label={texts.tiles.budget}
          />
          <KeyFigureTile
            Icon={PersonSimpleWalkIcon}
            value={display.distance}
            label={texts.tiles.distance}
          />
          <KeyFigureTile Icon={FlagIcon} value={display.steps.count} label={texts.tiles.steps} />
        </ul>

        {/* Under the rating on the phone, under the tiles from the tablet (E-21). */}
        {isPremium && <PremiumNote text={texts.premiumNote} />}
      </div>
    </article>
  );
}
