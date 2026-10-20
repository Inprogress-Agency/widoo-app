/**
 * The orchestration of the content being edited (Orchestration, D-088): `computeRoute` on our
 * estimated trips only, never an answer of Mapbox, with the thresholds and buckets the team set
 * in `settings`. Run at every save, so that `computed` follows the steps.
 */
import {
  computeRoute,
  orchestrationSettingKeys,
  orchestrationSettingsOf,
  type ComputedRoute,
  type RouteInput,
  type Transition,
} from '@widoo/orchestration';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { cities, media, places } from '../db/schema';
import { hoursByPlace } from '../planned/snapshot';
import { readSettings } from '../search/settings';
import { transitionsOf, type RouteContent } from './content';
import type { RouteRow } from './lifecycle';

/** The columns of a place the editor shows and the orchestration reads. */
const placeColumns = {
  id: places.id,
  name: places.name,
  category: places.category,
  location: places.location,
  address: places.address,
  cityId: places.cityId,
  isIndoor: places.isIndoor,
  alwaysOpen: places.alwaysOpen,
  verificationStatus: places.verificationStatus,
  verifiedAt: places.verifiedAt,
};
export type PlaceRow = { [K in keyof typeof placeColumns]: (typeof places.$inferSelect)[K] };

/** The places of the steps by id; a missing id is absent from the map. */
export async function placesOf(tx: Tx, ids: readonly string[]): Promise<Map<string, PlaceRow>> {
  if (ids.length === 0) return new Map();
  const rows = await tx
    .select(placeColumns)
    .from(places)
    .where(inArray(places.id, [...new Set(ids)]));
  return new Map(rows.map((row) => [row.id, row]));
}

/** Owners that have at least one photo: the route, its steps, their places. */
async function ownersWithPhoto(tx: Tx, routeId: string, content: RouteContent) {
  const stepIds = content.steps.map((step) => step.id);
  const placeIds = content.steps.map((step) => step.placeId);
  const rows = await tx
    .selectDistinct({ ownerId: media.ownerId })
    .from(media)
    .where(
      or(
        and(eq(media.ownerType, 'route'), eq(media.ownerId, routeId)),
        stepIds.length > 0
          ? and(eq(media.ownerType, 'step'), inArray(media.ownerId, stepIds))
          : undefined,
        placeIds.length > 0
          ? and(eq(media.ownerType, 'place'), inArray(media.ownerId, placeIds))
          : undefined,
      ),
    );
  return new Set(rows.map((row) => row.ownerId));
}

/** IANA zone of a city: the hours of its places are local times. */
async function timeZoneOf(tx: Tx, cityId: string): Promise<string> {
  const [city] = await tx
    .select({ timezone: cities.timezone })
    .from(cities)
    .where(eq(cities.id, cityId));
  if (!city) throw new Error(`City ${cityId} of a route was not found`);
  return city.timezone;
}

export interface Recomputed {
  placeById: Map<string, PlaceRow>;
  /** Our estimates, the trips stored with the steps. */
  transitions: (Transition | null)[];
  result: ComputedRoute;
}

/** The content with its places, estimated trips, and the result of the engine at `now`. */
export async function recomputeRoute(
  tx: Tx,
  route: Pick<RouteRow, 'id' | 'cityId'>,
  content: RouteContent,
  now: Date,
): Promise<Recomputed> {
  const placeById = await placesOf(
    tx,
    content.steps.map((step) => step.placeId),
  );
  const placeOf = (id: string) => {
    const place = placeById.get(id);
    if (!place) throw new Error(`Place ${id} of a step was not loaded`);
    return place;
  };
  const locations = new Map([...placeById].map(([id, place]) => [id, place.location]));
  const firstPlace = content.steps[0] && placeOf(content.steps[0].placeId);
  const [transitions, withPhoto, hours, values, timeZone] = await Promise.all([
    transitionsOf(content, locations),
    ownersWithPhoto(tx, route.id, content),
    hoursByPlace(tx, [...placeById.keys()]),
    readSettings(tx, orchestrationSettingKeys),
    // The city of the first step, the one the route moves to at the save (D-085).
    timeZoneOf(tx, firstPlace?.cityId ?? route.cityId),
  ]);
  const input: RouteInput = {
    title: content.title || null,
    description: content.description,
    hasPhoto: withPhoto.has(route.id),
    suggestedStart: content.suggestedStart,
    timeZone,
    steps: content.steps.map((step, index) => {
      const place = placeOf(step.placeId);
      return {
        id: step.id,
        placeId: step.placeId,
        durationMin: step.durationMin,
        costPerPersonEur: step.costPerPersonEur,
        bookingRequired: step.bookingRequired,
        transition: transitions[index] ?? null,
        hasPhoto: withPhoto.has(step.id) || withPhoto.has(step.placeId),
        place: {
          location: place.location,
          hours: hours.get(place.id) ?? [],
          alwaysOpen: place.alwaysOpen,
          isIndoor: place.isIndoor,
          verificationStatus: place.verificationStatus,
          verifiedAt: place.verifiedAt?.toISOString() ?? null,
        },
      };
    }),
  };
  const result = computeRoute(input, { now, ...orchestrationSettingsOf(values) });
  return { placeById, transitions, result };
}
