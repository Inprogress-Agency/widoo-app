/**
 * The route as a user plans it (`route_revision_snapshot`), and its timeline for a start. The
 * trips are the estimated ones of the orchestration, without the directions provider: the terms
 * of Mapbox forbid storing its answers (#378), and the snapshot is stored.
 */
import { computeTimeline, computeTransitions } from '@widoo/orchestration';
import {
  StepTransition,
  type PlaceHours,
  type PlannedRouteSnapshot,
  type RouteStatus,
  type RouteTimeline,
} from '@widoo/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { cities, placeHours, places, routes, steps } from '../db/schema';
import { photosByOwner } from '../media/photos';

/** Statuses of a route that can be planned: published, even when marked « à corriger ». */
const plannableStatuses: readonly RouteStatus[] = ['published', 'needs_fix'];

/** Booking links leave the API in https only (wiki Securite-et-RGPD). */
const httpsOrNull = (url: string | null) => (url?.startsWith('https://') ? url : null);

/** `HH:MM` of a Postgres `time`. */
const hourMinute = (time: string) => time.slice(0, 5);

/** Opening slots of each place, by weekday then opening; a place without any is absent. */
export async function hoursByPlace(
  db: Db | Tx,
  placeIds: string[],
): Promise<Map<string, PlaceHours[]>> {
  const rows =
    placeIds.length === 0
      ? []
      : await db
          .select()
          .from(placeHours)
          .where(inArray(placeHours.placeId, placeIds))
          .orderBy(asc(placeHours.weekday), asc(placeHours.opens));
  const byPlace = new Map<string, PlaceHours[]>();
  for (const row of rows) {
    const list = byPlace.get(row.placeId) ?? [];
    list.push({
      weekday: row.weekday,
      opens: hourMinute(row.opens),
      closes: hourMinute(row.closes),
      validFrom: row.validFrom,
      validTo: row.validTo,
    });
    byPlace.set(row.placeId, list);
  }
  return byPlace;
}

/**
 * The snapshot of a route that can be planned, with its stored access; undefined for a route
 * that does not exist, is not published, or has no step.
 */
export async function snapshotOf(
  db: Db,
  routeId: string,
): Promise<PlannedRouteSnapshot | undefined> {
  const [route] = await db
    .select({
      id: routes.id,
      title: routes.title,
      access: routes.access,
      isOfficial: routes.isOfficial,
      status: routes.status,
      timezone: cities.timezone,
    })
    .from(routes)
    .innerJoin(cities, eq(cities.id, routes.cityId))
    .where(eq(routes.id, routeId));
  if (!route || !plannableStatuses.includes(route.status)) {
    return undefined;
  }
  const rows = await db
    .select({ step: steps, place: places })
    .from(steps)
    .innerJoin(places, eq(places.id, steps.placeId))
    .where(eq(steps.routeId, routeId))
    .orderBy(asc(steps.position));
  if (rows.length === 0) {
    return undefined;
  }
  const hours = await hoursByPlace(db, [...new Set(rows.map(({ place }) => place.id))]);
  // Frozen by their URL with the rest: E-07 keeps the whole route on the phone.
  const photos = await photosByOwner(
    db,
    'step',
    rows.map(({ step }) => step.id),
  );
  // The mode chosen by the creator, kept from the stored trip; its measures are estimated again.
  const transitions = await computeTransitions(
    rows.map(({ step, place }) => ({
      location: place.location,
      mode: StepTransition.safeParse(step.transition).data?.mode ?? null,
    })),
    { directions: null, cache: null },
  );
  return {
    id: route.id,
    title: route.title,
    access: route.access,
    isOfficial: route.isOfficial,
    timezone: route.timezone,
    steps: rows.map(({ step, place }, index) => {
      const transition = transitions[index] ?? null;
      return {
        id: step.id,
        position: step.position,
        title: step.title,
        description: step.description,
        durationMin: step.durationMin,
        costPerPersonEur: step.costPerPerson,
        bookingRequired: step.bookingRequired,
        bookingUrl: httpsOrNull(step.bookingUrl),
        bookingProvider: step.bookingProvider,
        transitionNote: step.transitionNote,
        transition: transition && {
          distanceM: transition.distanceM,
          durationMin: transition.durationMin,
          mode: transition.mode,
          estimated: transition.estimated,
        },
        place: {
          id: place.id,
          name: place.name,
          category: place.category,
          location: place.location,
          address: place.address,
          isIndoor: place.isIndoor,
          alwaysOpen: place.alwaysOpen,
          hours: hours.get(place.id) ?? [],
        },
        highlights: step.highlights ?? [],
        photos: photos.get(step.id) ?? [],
      };
    }),
  };
}

/** Timeline of the snapshot for `startsAt`, with the conflicts of the hours it froze. */
export function timelineOf(snapshot: PlannedRouteSnapshot, startsAt: Date): RouteTimeline {
  return computeTimeline(
    snapshot.steps.map((step) => ({
      id: step.id,
      durationMin: step.durationMin,
      transitionMin: step.transition?.durationMin ?? null,
      hours: step.place.hours,
      alwaysOpen: step.place.alwaysOpen,
    })),
    startsAt,
    snapshot.timezone,
  );
}
