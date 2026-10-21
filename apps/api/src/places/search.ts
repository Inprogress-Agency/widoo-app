/** `GET /places/search`: the places of Widoo that a text, a position or a category designates (E-13). */
import type { PlaceSearchHit, PlaceSearchQuery } from '@widoo/shared';
import { and, asc, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client';
import { places } from '../db/schema';
import { hitColumns, toHit, type HitRow } from './read';

/** `%`, `_` and `\` of a text typed by a user are letters, not wildcards of `ILIKE`. */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/** SQL of the distance in metres from a place to `near`. */
export const distanceTo = (near: { lat: number; lng: number }) =>
  sql<number>`ST_Distance(${places.location}, ST_MakePoint(${near.lng}::float8, ${near.lat}::float8)::geography)`;

/**
 * The places whose name holds the text (or is close to it, trigrams), in the category if given.
 * Closed places are not offered. With a text, the closest names come first; then the nearest.
 */
export async function searchPlaces(db: Db, query: PlaceSearchQuery): Promise<PlaceSearchHit[]> {
  const { q, near, category, limit } = query;
  const distance = near ? distanceTo(near) : null;
  const conditions: SQL[] = [ne(places.verificationStatus, 'closed')];
  if (q) {
    conditions.push(sql`(${places.name} ilike ${likePattern(q)} or ${places.name} % ${q})`);
  }
  if (category) conditions.push(eq(places.category, category));
  const rows = await db
    .select(hitColumns(distance))
    .from(places)
    .where(and(...conditions))
    .orderBy(
      ...(q ? [desc(sql`similarity(${places.name}, ${q})`)] : []),
      ...(distance ? [asc(distance)] : []),
      asc(places.name),
    )
    .limit(limit);
  return rows.map((row) => toHit(row as HitRow));
}
