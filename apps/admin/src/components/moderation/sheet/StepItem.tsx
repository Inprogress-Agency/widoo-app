import { formatDuration } from '@/lib/dates';
import { messages } from '@/messages/fr';
import {
  ArrowSquareOutIcon,
  ClockIcon,
  FootprintsIcon,
  WalletIcon,
  WarningIcon,
} from '@phosphor-icons/react/dist/ssr';
import { labels, type ModerationStep } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';

const texts = messages.moderation.sheet;

/** Host of a booking link, as the sheet shows it next to « Réserver »: « thefork.fr ». */
const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/**
 * A step of the route on the sheet: the way from the previous step, then its number, its place,
 * the time spent there, its cost and its booking link.
 */
export function StepItem({ step, number }: { step: ModerationStep; number: number }) {
  const { transition, place } = step;
  return (
    <li className="flex flex-col gap-10">
      {transition ? (
        <p className="ml-12 flex items-center gap-8 border-l border-border pl-20 text-label text-muted-foreground">
          <FootprintsIcon aria-hidden className="size-16" />
          {texts.transition(
            `${formatDuration(Math.round(transition.durationMin))} ${texts.transports[transition.mode]}`,
            transition.distanceM,
          )}
        </p>
      ) : null}
      <div className="flex gap-12">
        <span
          aria-hidden
          className="flex size-step-dot shrink-0 items-center justify-center rounded-pill bg-blue-ink text-number-s text-on-blue"
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-col gap-4">
          <h4 className="flex flex-wrap items-center gap-8 text-title-card">
            <span className="sr-only">{number}. </span>
            {step.title}
            {place.verificationStatus === 'verified' ? null : (
              <StatusBadge
                tone="alert"
                icon={<WarningIcon aria-hidden weight="fill" className="size-16" />}
              >
                {texts.neverVerified}
              </StatusBadge>
            )}
          </h4>
          <p className="text-label text-muted-foreground">
            {labels.fr.placeCategories[place.category]}
            {step.title === place.name ? null : ` · ${place.name}`}
          </p>
          <p className="flex flex-wrap items-center gap-16 text-body-s text-muted-foreground">
            <span className="inline-flex items-center gap-6">
              <ClockIcon aria-hidden className="size-16" />
              {texts.onSite(formatDuration(step.durationMin))}
            </span>
            {step.costPerPersonEur === null ? null : (
              <span className="inline-flex items-center gap-6">
                <WalletIcon aria-hidden className="size-16" />
                {step.costPerPersonEur === 0 ? texts.free : texts.perPerson(step.costPerPersonEur)}
              </span>
            )}
          </p>
          {step.bookingUrl ? (
            <a
              href={step.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-6 text-control text-blue-ink hover:underline"
            >
              {texts.book}
              <ArrowSquareOutIcon aria-hidden className="size-16" />
              <span className="text-body-s text-muted-foreground">{hostOf(step.bookingUrl)}</span>
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}
