/**
 * `sort=recommended` (wiki Filtres-et-Recherche › Recommandation « autour de moi »): every route
 * of the search is ranked in memory, since the diversity pass reorders across the scores; the
 * page is then read by position. The cursor holds the position and the instant of the first
 * page, so that the part of the day, hence the order, stays the same while scrolling.
 */
import { taxonomies, type LatLng, type RouteCard, type RouteSearchQuery } from '@widoo/shared';
import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { RouteViewer } from '../access/route-access';
import type { Db } from '../db/client';
import type { BBox } from '../db/geography';
import { ratingOf } from '../db/route-stats';
import { cities, routes, steps, places } from '../db/schema';
import { rankCandidates, type Candidate, type Ranked } from '../recommendation/rank';
import { stableComponentsOf } from '../recommendation/stable';
import type { RecommendationWeights } from '../recommendation/weights';
import { httpError } from '../errors';
import { decodeCursor, encodeCursor } from './cursor';
import { cardColumns, cardJoins, searchWhere, toCard, type CardRow } from './repository';

const CandidateRow = z.object({
  id: z.uuid(),
  recommendation: z.unknown(),
  is_official: z.boolean(),
  stats: z.unknown(),
  published_ms: z.number().nullable(),
  main_mood: z.enum(taxonomies.moods).nullable(),
  neighborhood: z.string().nullable(),
  timezone: z.string().min(1),
  distance_m: z.number().nonnegative(),
});

/** The position, or the centre of the zone without one (wiki: point de référence). */
export const referenceOf = (bbox: BBox, near: LatLng | undefined): LatLng =>
  near ?? { lat: (bbox.south + bbox.north) / 2, lng: (bbox.west + bbox.east) / 2 };

/** Every route of the search, with what its score needs. Exported for the bench. */
export function candidatesSql(query: RouteSearchQuery): SQL {
  const { lat, lng } = referenceOf(query.bbox, query.near);
  return sql`
    select ${routes.id} as id, ${routes.recommendation} as recommendation,
      ${routes.isOfficial} as is_official, ${routes.stats} as stats,
      (extract(epoch from ${routes.publishedAt}) * 1000)::float8 as published_ms,
      ${routes.moods}[1] as main_mood,
      ${cities.timezone} as timezone,
      ST_Distance(${routes.startLocation}, ST_MakePoint(${lng}::float8, ${lat}::float8)::geography)::float8 as distance_m,
      (select ${places.addressComponents}->>'neighborhood' from ${steps}
        join ${places} on ${places.id} = ${steps.placeId}
        where ${steps.routeId} = ${routes.id} order by ${steps.position} limit 1) as neighborhood
    from ${routes}
    join ${cities} on ${cities.id} = ${routes.cityId}
    where ${searchWhere(query)}
  `;
}

/** Card fields of the given routes, in the given order. */
function cardsSql(ids: readonly string[]): SQL {
  const list = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  return sql`
    select page.id, ${cardColumns}
    from unnest(array[${list}]::uuid[]) with ordinality as page(id, position)
    join routes r on r.id = page.id
    ${cardJoins}
    order by page.position
  `;
}

/**
 * The instant of a first page, to the minute: the part of the day only changes by the hour, and
 * the same search gives the same answer, hence the same ETag, within the minute.
 */
const minuteMs = 60_000;

export type RecommendationSettings = { weights: RecommendationWeights; now: Date };

/**
 * One page of recommended cards for a caller, anonymous when null, each with its reason, after
 * the cursor. The right to a route is read at `settings.now`, never at the instant of the cursor.
 */
export async function searchRecommended(
  db: Db,
  query: RouteSearchQuery,
  settings: RecommendationSettings,
  viewer: RouteViewer | null,
): Promise<{ items: RouteCard[]; nextCursor: string | null }> {
  const [offset, at] = query.cursor
    ? decodeCursor(query.cursor, 'recommended', ['int', 'bigint'])
    : [0, String(Math.floor(settings.now.getTime() / minuteMs) * minuteMs)];
  if (typeof offset !== 'number' || offset < 0) throw httpError(400, 'Invalid cursor');
  const now = new Date(Number(at));
  if (Number.isNaN(now.getTime())) throw httpError(400, 'Invalid cursor');

  const candidates: Candidate[] = (await db.execute(candidatesSql(query))).map((raw) => {
    const row = CandidateRow.parse(raw);
    return {
      id: row.id,
      distanceM: row.distance_m,
      timezone: row.timezone,
      mainMood: row.main_mood,
      neighborhood: row.neighborhood,
      stable: stableComponentsOf(
        row.recommendation,
        {
          isOfficial: row.is_official,
          rating: ratingOf(row.stats),
          publishedAt: row.published_ms === null ? null : new Date(row.published_ms),
        },
        now,
      ),
    };
  });
  const ranked = rankCandidates(candidates, {
    weights: settings.weights,
    now,
    hasPosition: query.near !== undefined,
  });
  const page: Ranked[] = ranked.slice(offset, offset + query.limit);
  const end = offset + page.length;
  const nextCursor = end < ranked.length ? encodeCursor('recommended', [end, String(at)]) : null;
  if (page.length === 0) return { items: [], nextCursor };

  const reasons = new Map(page.map((item) => [item.id, item.reason]));
  const rows = await db.execute<CardRow>(cardsSql(page.map((item) => item.id)));
  return {
    items: rows.map((row) => ({
      ...toCard(row, viewer, settings.now),
      reason: reasons.get(row.id) ?? null,
    })),
    nextCursor,
  };
}
