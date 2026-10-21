/** Places as the API serves them (wiki API › Lieux): the full place, and the hit of a search. */
import { Place, type PlaceSearchHit } from '@widoo/shared';
import { eq, sql, type SQL } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { places } from '../db/schema';
import { hoursByPlace } from '../planned/snapshot';

/** Columns of a hit; `distance` is the SQL of the distance to the point searched around, if any. */
export const hitColumns = (distance: SQL<number> | null) => ({
  id: places.id,
  name: places.name,
  category: places.category,
  lat: sql<number>`ST_Y(${places.location}::geometry)`,
  lng: sql<number>`ST_X(${places.location}::geometry)`,
  address: places.address,
  isIndoor: places.isIndoor,
  verificationStatus: places.verificationStatus,
  verifiedAt: places.verifiedAt,
  distanceM: distance ?? sql<null>`null`,
});

export type HitRow = {
  id: string;
  name: string;
  category: Place['category'];
  lat: number;
  lng: number;
  address: string;
  isIndoor: boolean;
  verificationStatus: Place['verificationStatus'];
  verifiedAt: Date | null;
  distanceM: number | null;
};

export const toHit = (row: HitRow): PlaceSearchHit => ({
  id: row.id,
  name: row.name,
  category: row.category,
  location: { lat: row.lat, lng: row.lng },
  address: row.address,
  isIndoor: row.isIndoor,
  verificationStatus: row.verificationStatus,
  verifiedAt: row.verifiedAt?.toISOString() ?? null,
  distanceM: row.distanceM === null ? null : Math.round(Number(row.distanceM)),
});

/** The place with its hours; undefined when it does not exist. */
export async function readPlace(db: Db | Tx, id: string): Promise<Place | undefined> {
  const [row] = await db.select(hitColumns(null)).from(places).where(eq(places.id, id));
  if (!row) return undefined;
  const hit = toHit(row);
  const hours = (await hoursByPlace(db, [id])).get(id) ?? [];
  return Place.parse({ ...hit, hours });
}
