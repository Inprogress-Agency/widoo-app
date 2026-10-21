/**
 * `POST /places` (E-13, D-049): a place of a user, `unverified`, in the city that holds it. A close
 * place of a close name is offered instead (409), unless the creator insists.
 */
import {
  placeCreationDailyLimit,
  placeDuplicateNameSimilarity,
  placeDuplicateRadiusM,
  type CreatePlace,
  type Place,
} from '@widoo/shared';
import { and, count, eq, gt, ne, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { cities, placeHours, places, users } from '../db/schema';
import { bodyValidationError, conflict, placeCreationLimitReached } from '../errors';
import { hitColumns, readPlace, toHit, type HitRow } from './read';
import { distanceTo } from './search';

const dayMs = 24 * 60 * 60 * 1000;

/** The city whose envelope holds the point; the cities of a new place are made by #340. */
export async function cityHolding(tx: Db | Tx, point: { lat: number; lng: number }) {
  const [city] = await tx
    .select({ id: cities.id })
    .from(cities)
    .where(
      sql`ST_Covers(${cities.bounds}, ST_MakePoint(${point.lng}::float8, ${point.lat}::float8)::geography)`,
    )
    .limit(1);
  return city?.id;
}

export const outsideAnyCity = () =>
  bodyValidationError([
    {
      path: 'location',
      code: 'outside_service_area',
      message: 'No city holds this position yet',
    },
  ]);

/** The nearest place of a close name within the radius, if any: the one E-13 offers. */
async function closePlace(tx: Tx, input: Pick<CreatePlace, 'name' | 'location'>) {
  const similarity = sql<number>`similarity(${places.name}, ${input.name})`;
  const [row] = await tx
    .select(hitColumns(distanceTo(input.location)))
    .from(places)
    .where(
      and(
        ne(places.verificationStatus, 'closed'),
        sql`ST_DWithin(${places.location}, ST_MakePoint(${input.location.lng}::float8, ${input.location.lat}::float8)::geography, ${placeDuplicateRadiusM})`,
        sql`${similarity} >= ${placeDuplicateNameSimilarity}`,
      ),
    )
    .orderBy(sql`${similarity} desc`)
    .limit(1);
  return row ? toHit(row as HitRow) : undefined;
}

/**
 * Throws 429 when the account already created the daily maximum. The account row is locked, so
 * two creations at once cannot both take the last place.
 */
async function assertCreationRoom(tx: Tx, userId: string, now: Date): Promise<void> {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('no key update');
  const [created] = await tx
    .select({ count: count() })
    .from(places)
    .where(
      and(eq(places.createdBy, userId), gt(places.createdAt, new Date(now.getTime() - dayMs))),
    );
  if ((created?.count ?? 0) >= placeCreationDailyLimit) {
    throw placeCreationLimitReached(placeCreationDailyLimit);
  }
}

export async function createPlace(
  db: Db,
  userId: string,
  { force, hours, ...input }: CreatePlace,
  now: Date,
): Promise<Place> {
  return db.transaction(async (tx) => {
    await assertCreationRoom(tx, userId, now);
    const cityId = await cityHolding(tx, input.location);
    if (!cityId) throw outsideAnyCity();
    if (!force) {
      const candidate = await closePlace(tx, input);
      if (candidate) {
        throw conflict('A place with a close name is nearby', {
          reason: 'similar_place',
          candidate,
        });
      }
    }
    const [created] = await tx
      .insert(places)
      .values({ ...input, cityId, verificationStatus: 'unverified', createdBy: userId })
      .returning({ id: places.id });
    if (!created) throw new Error('Place not created');
    if (hours.length > 0) {
      await tx.insert(placeHours).values(hours.map((slot) => ({ ...slot, placeId: created.id })));
    }
    const place = await readPlace(tx, created.id);
    if (!place) throw new Error('Place not found after creation');
    return place;
  });
}
