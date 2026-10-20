/**
 * The orchestration of the content being edited: its places, its estimated trips and the rules
 * it breaks, at every save and every read of the editor.
 */
import { evaluateRoute } from '@widoo/orchestration';
import type { RouteEvaluation } from '@widoo/shared';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { media, places } from '../db/schema';
import { transitionsOf, type RouteContent } from './content';

type PlaceRow = Pick<
  typeof places.$inferSelect,
  'id' | 'name' | 'category' | 'location' | 'address' | 'cityId'
>;

/** The places of the steps by id; a missing id is absent from the map. */
export async function placesOf(tx: Tx, ids: readonly string[]): Promise<Map<string, PlaceRow>> {
  if (ids.length === 0) return new Map();
  const rows = await tx
    .select({
      id: places.id,
      name: places.name,
      category: places.category,
      location: places.location,
      address: places.address,
      cityId: places.cityId,
    })
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

/** The content with its places, estimated trips and orchestration result at `now`. */
export async function evaluate(tx: Tx, routeId: string, content: RouteContent, now: Date) {
  const placeById = await placesOf(
    tx,
    content.steps.map((step) => step.placeId),
  );
  const locations = new Map([...placeById].map(([id, place]) => [id, place.location]));
  const [transitions, withPhoto] = await Promise.all([
    transitionsOf(content, locations),
    ownersWithPhoto(tx, routeId, content),
  ]);
  const evaluation: RouteEvaluation = evaluateRoute(
    {
      title: content.title || null,
      description: content.description,
      hasPhoto: withPhoto.has(routeId),
      steps: content.steps.map((step, index) => ({
        placeId: step.placeId,
        durationMin: step.durationMin,
        costPerPersonEur: step.costPerPersonEur,
        transition: transitions[index] ?? null,
        hasPhoto: withPhoto.has(step.id) || withPhoto.has(step.placeId),
      })),
    },
    now,
  );
  return { placeById, transitions, evaluation };
}
