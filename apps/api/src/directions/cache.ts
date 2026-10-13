/**
 * Cache of the Directions answers in `direction_cache`, by profile and pair of rounded points,
 * kept `ttlMs`. A failing database never stops the transitions: a read error is a miss, a write
 * error is dropped, both reported.
 */
import type { Directions, DirectionsCache, DirectionsLeg } from '@widoo/orchestration';
import { roundedPoint } from '@widoo/orchestration';
import type { LatLng } from '@widoo/shared';
import { and, eq, gt, or } from 'drizzle-orm';
import type { Db } from '../db/client';
import { directionCache } from '../db/schema';

/** A rounded coordinate times 100 000: an integer, compared exactly. */
const e5 = (degrees: number) => Math.round(degrees * 100_000);

const columnsOf = ({ from, to, profile }: DirectionsLeg) => {
  const start = roundedPoint(from);
  const end = roundedPoint(to);
  return {
    profile,
    fromLatE5: e5(start.lat),
    fromLngE5: e5(start.lng),
    toLatE5: e5(end.lat),
    toLngE5: e5(end.lng),
  };
};

export interface DirectionsCacheOptions {
  ttlMs: number;
  now?: () => Date;
  onError?: (error: unknown, operation: 'read' | 'write') => void;
}

export function createDirectionsCache(db: Db, options: DirectionsCacheOptions): DirectionsCache {
  const now = options.now ?? (() => new Date());
  return {
    async get(leg): Promise<Directions | undefined> {
      const key = columnsOf(leg);
      try {
        const [row] = await db
          .select({
            distanceM: directionCache.distanceM,
            durationS: directionCache.durationS,
            geometry: directionCache.geometry,
          })
          .from(directionCache)
          .where(
            and(
              eq(directionCache.profile, key.profile),
              eq(directionCache.fromLatE5, key.fromLatE5),
              eq(directionCache.fromLngE5, key.fromLngE5),
              eq(directionCache.toLatE5, key.toLatE5),
              eq(directionCache.toLngE5, key.toLngE5),
              gt(directionCache.expiresAt, now()),
            ),
          )
          .limit(1);
        return row;
      } catch (error) {
        options.onError?.(error, 'read');
        return undefined;
      }
    },
    async set(leg, directions): Promise<void> {
      const at = now();
      const values = {
        distanceM: Math.round(directions.distanceM),
        durationS: Math.round(directions.durationS),
        geometry: directions.geometry,
        createdAt: at,
        expiresAt: new Date(at.getTime() + options.ttlMs),
      };
      try {
        await db
          .insert(directionCache)
          .values({ ...columnsOf(leg), ...values })
          .onConflictDoUpdate({
            target: [
              directionCache.profile,
              directionCache.fromLatE5,
              directionCache.fromLngE5,
              directionCache.toLatE5,
              directionCache.toLngE5,
            ],
            set: values,
          });
      } catch (error) {
        options.onError?.(error, 'write');
      }
    },
  };
}

/**
 * Deletes the cached trips from and to the former point of a moved place, in every profile:
 * to call in the same transaction as the move. Its trips are then asked again.
 */
export async function forgetTripsOf(db: Pick<Db, 'delete'>, former: LatLng): Promise<void> {
  const point = roundedPoint(former);
  const lat = e5(point.lat);
  const lng = e5(point.lng);
  await db
    .delete(directionCache)
    .where(
      or(
        and(eq(directionCache.fromLatE5, lat), eq(directionCache.fromLngE5, lng)),
        and(eq(directionCache.toLatE5, lat), eq(directionCache.toLngE5, lng)),
      ),
    );
}
