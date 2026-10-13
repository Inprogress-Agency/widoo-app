import { RouteStatusBadge } from '@/components/routes/RouteStatusBadge';
import { hoursToDayTexts } from '@/lib/place-hours';
import { messages } from '@/messages/fr';
import { labels, type CatalogPlaceDetail } from '@widoo/shared';
import type { ReactNode } from 'react';

const texts = messages.catalog.places.panel;

/** A line of the sheet: what it is on the left, its value on the right. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-12 text-body-s">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right">{children}</dd>
    </div>
  );
}

/**
 * The sheet of a place inside the detail panel: its address and practical details, its hours day
 * by day, and the routes that go through it.
 */
export function PlaceDetailContent({ place }: { place: CatalogPlaceDetail }) {
  const dayTexts = hoursToDayTexts(place.hours);
  const hasHours = place.hours.length > 0;
  return (
    <>
      <dl className="flex flex-col gap-8">
        <Line label={messages.catalog.places.columns.category}>
          {labels.fr.placeCategories[place.category]}
        </Line>
        <Line label={texts.address}>{place.address}</Line>
        <Line label={texts.position}>
          {place.location.lat.toFixed(5)}, {place.location.lng.toFixed(5)}
        </Line>
        <Line label={texts.indoor}>{place.isIndoor ? texts.yes : texts.no}</Line>
        <Line label={texts.price}>
          {place.priceRange ? labels.fr.priceRanges[place.priceRange] : texts.none}
        </Line>
        <Line label={texts.website}>{place.websiteUrl ?? texts.none}</Line>
        <Line label={texts.phone}>{place.phone ?? texts.none}</Line>
      </dl>
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">{texts.hours}</h3>
        {hasHours ? (
          <dl className="flex flex-col gap-4">
            {messages.catalog.places.weekdays.map((day, index) => (
              <Line key={day} label={day}>
                {dayTexts[index] || texts.closed}
              </Line>
            ))}
          </dl>
        ) : (
          <p className="text-body-s text-muted-foreground">{texts.hoursUnknown}</p>
        )}
      </section>
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">
          {place.routes.length > 0 ? texts.routes(place.routes.length) : texts.noRoute}
        </h3>
        <ul className="flex flex-col gap-6">
          {place.routes.map((route) => (
            <li key={route.id} className="flex items-center justify-between gap-8 text-body-s">
              <span className="min-w-0 truncate">{route.title}</span>
              <RouteStatusBadge status={route.status} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
