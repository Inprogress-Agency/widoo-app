/**
 * What the sheet of a route reads from the database (wiki API › Fiche parcours): the route row
 * and its city, its card fields as the search reads them (same budget, same buckets), its steps
 * with their places, hours and photos. Who may read it is decided apart (`sheetAccessOf`).
 */
import { StepTransition, type LatLng, type Photo, type PlaceHours } from '@widoo/shared';
import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { cities, places, routes, steps } from '../db/schema';
import { photosByOwner } from '../media/photos';
import { hoursByPlace } from '../planned/snapshot';
import { cardColumns, cardJoins, type CardRow } from '../search/repository';

export type SheetRouteRow = typeof routes.$inferSelect;

export interface SheetStepRow {
  step: typeof steps.$inferSelect;
  place: typeof places.$inferSelect;
  hours: PlaceHours[];
  /** The mode the creator chose for the trip to the next step, kept in the stored trip. */
  mode: StepTransition['mode'] | null;
  photos: Photo[];
  placePhoto: Photo | null;
}

export interface LoadedSheet {
  route: SheetRouteRow;
  timezone: string;
  cityCenter: LatLng;
  /** Null for a route without a step or not computed yet: it has no sheet. */
  card: CardRow | null;
  steps: SheetStepRow[];
  photos: Photo[];
}

/** The route row and its city, enough to decide the access; undefined for an unknown id. */
export async function loadSheetRoute(db: Db, id: string) {
  const [row] = await db
    .select({ route: routes, timezone: cities.timezone, cityCenter: cities.center })
    .from(routes)
    .innerJoin(cities, eq(cities.id, routes.cityId))
    .where(eq(routes.id, id));
  return row;
}

/** Everything else the sheet shows of a route the caller may read. */
export async function loadSheet(
  db: Db,
  { route, timezone, cityCenter }: NonNullable<Awaited<ReturnType<typeof loadSheetRoute>>>,
): Promise<LoadedSheet> {
  const [[card], rows, routePhotos] = await Promise.all([
    db.execute<CardRow>(sql`
      select r.id, ${cardColumns}
      from routes r
      ${cardJoins}
      where r.id = ${route.id} and r.computed is not null
        and r.duration_bucket is not null and r.budget_bucket is not null
    `),
    db
      .select({ step: steps, place: places })
      .from(steps)
      .innerJoin(places, eq(places.id, steps.placeId))
      .where(eq(steps.routeId, route.id))
      .orderBy(asc(steps.position)),
    photosByOwner(db, 'route', [route.id]),
  ]);
  const placeIds = [...new Set(rows.map(({ place }) => place.id))];
  const [hours, stepPhotos, placePhotos] = await Promise.all([
    hoursByPlace(db, placeIds),
    photosByOwner(
      db,
      'step',
      rows.map(({ step }) => step.id),
    ),
    photosByOwner(db, 'place', placeIds),
  ]);
  return {
    route,
    timezone,
    cityCenter,
    card: card && rows.length > 0 ? card : null,
    photos: routePhotos.get(route.id) ?? [],
    steps: rows.map(({ step, place }) => ({
      step,
      place,
      hours: hours.get(place.id) ?? [],
      mode: StepTransition.safeParse(step.transition).data?.mode ?? null,
      photos: stepPhotos.get(step.id) ?? [],
      placePhoto: placePhotos.get(place.id)?.[0] ?? null,
    })),
  };
}
