import { formatDuration } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { ModerationRouteDetail } from '@widoo/shared';
import Image from 'next/image';
import { StatTile } from './StatTile';

const texts = messages.moderation.sheet;
const missing = '—';

/** The route as it will be published: photos, description, then duration, budget and distance. */
export function RoutePreview({ route }: { route: ModerationRouteDetail }) {
  return (
    <section className="flex flex-col gap-16">
      <h3 className="text-title-s">{texts.previewTitle}</h3>
      {route.photoUrls.length > 0 ? (
        <ul className="grid grid-cols-3 gap-8">
          {route.photoUrls.slice(0, 3).map((url) => (
            <li key={url}>
              <Image
                src={url}
                alt=""
                width={400}
                height={264}
                unoptimized
                className="h-card-photo w-full rounded-photo object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="whitespace-pre-line text-body">{route.description ?? texts.noDescription}</p>
      <dl className="grid grid-cols-4 gap-8">
        <StatTile
          label={texts.tiles.duration}
          value={route.durationMin === null ? missing : formatDuration(route.durationMin)}
        />
        <StatTile
          label={texts.tiles.budget}
          value={
            route.budgetPerPersonEur === null ? missing : texts.budget(route.budgetPerPersonEur)
          }
        />
        <StatTile label={texts.tiles.steps} value={String(route.steps.length)} />
        <StatTile
          label={texts.tiles.distance}
          value={route.distanceM === null ? missing : texts.distance(route.distanceM)}
        />
      </dl>
    </section>
  );
}
