/** Queries of the route search: one page of cards, the clusters of a large zone, the counts. */
import {
  taxonomies,
  type RouteCard,
  type RouteCluster,
  type RouteCount,
  type RouteCountQuery,
  type RouteFilterGroup,
  type RouteSearchQuery,
} from '@widoo/shared';
import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client';
import type { BBox } from '../db/geography';
import { routes } from '../db/schema';
import { decodeCursor, encodeCursor, type SortKeyValue } from './cursor';
import { activeFilters, allOf, inZone } from './filters';
import { after, keyColumn, orderBy, sortKeys, type SortKey } from './sort';

/** `routes.computed` as the orchestration writes it: the card only reads these fields. */
const Computed = z.object({
  duration_min: z.number().int().nonnegative(),
  budget_per_person_eur: z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() }),
  distance_m: z.number().nonnegative(),
});

const Stats = z.object({
  rating_avg: z.number().min(1).max(5).nullable().catch(null).default(null),
  rating_count: z.number().int().nonnegative().catch(0).default(0),
});

const StepPin = z.object({
  category: z.enum(taxonomies.placeCategories),
  lat: z.number(),
  lng: z.number(),
  verified: z.boolean(),
  district: z.string().nullable(),
  neighborhood: z.string().nullable(),
});

type CardRow = {
  id: string;
  title: string;
  is_official: boolean;
  access: RouteCard['access'];
  moods: RouteCard['moods'];
  audiences: RouteCard['audiences'];
  duration_bucket: RouteCard['durationBucket'];
  budget_bucket: RouteCard['budgetBucket'];
  computed: unknown;
  stats: unknown;
  author_id: string | null;
  author_first_name: string | null;
  author_avatar_url: string | null;
  cover: string | null;
  steps: unknown;
  [key: `k${number}`]: SortKeyValue;
};

/**
 * Seed photos are stored as their https URL until the storage bucket exists; a storage path
 * has no public URL yet. Anything but https is dropped rather than sent to the app.
 */
const httpsOrNull = (url: string | null) => (url?.startsWith('https://') ? url : null);

function toCard(row: CardRow): RouteCard {
  const computed = Computed.parse(row.computed);
  const stats = Stats.parse(row.stats ?? {});
  const pins = z.array(StepPin).parse(row.steps ?? []);
  const start = pins[0];
  // A purged or anonymous author is shown without a creator line.
  const author =
    row.is_official || !row.author_id || !row.author_first_name
      ? null
      : {
          id: row.author_id,
          firstName: row.author_first_name,
          avatarUrl: httpsOrNull(row.author_avatar_url),
        };
  return {
    id: row.id,
    title: row.title,
    coverUrl: httpsOrNull(row.cover),
    isOfficial: row.is_official,
    author,
    access: row.access,
    // Verified badge: every place of the route is verified (wiki Creation-et-Moderation).
    isVerified: pins.length > 0 && pins.every((pin) => pin.verified),
    moods: row.moods,
    audiences: row.audiences,
    district: start?.district ?? null,
    neighborhood: start?.neighborhood ?? null,
    durationMin: computed.duration_min,
    durationBucket: row.duration_bucket,
    budgetPerPersonEur: computed.budget_per_person_eur,
    budgetBucket: row.budget_bucket,
    distanceM: computed.distance_m,
    rating: { average: stats.rating_avg, count: stats.rating_count },
    steps: pins.map((pin) => ({
      category: pin.category,
      location: { lat: pin.lat, lng: pin.lng },
    })),
  };
}

function keyValuesOf(row: CardRow, count: number): SortKeyValue[] {
  return Array.from({ length: count }, (_, index) => {
    const value = row[`k${index}`];
    if (value === undefined) throw new Error(`Sort key k${index} missing from the search row`);
    return value;
  });
}

/** Where clause of a search: the zone and every active filter group. */
function searchWhere(query: Pick<RouteSearchQuery, 'bbox' | RouteFilterGroup>) {
  return allOf([inZone(query.bbox), ...Object.values(activeFilters(query))]);
}

/**
 * SQL of one page of cards: the matching routes with their sort keys `k0…`, the page after the
 * cursor, plus one row to tell whether another page follows, then the card fields of the page.
 */
export function searchPageSql(
  query: RouteSearchQuery,
  keys: readonly SortKey[],
  cursor: readonly SortKeyValue[] | undefined,
): SQL {
  const keyColumns = sql.join(
    keys.map((key, index) => sql`${key.expr} as ${keyColumn(index)}`),
    sql`, `,
  );
  return sql`
    with matched as (
      select ${routes.id} as id, ${keyColumns} from ${routes} where ${searchWhere(query)}
    ),
    page as (
      select * from matched
      where ${cursor ? after(keys, cursor) : sql`true`}
      order by ${orderBy(keys)}
      limit ${query.limit + 1}
    )
    select page.*, r.title, r.is_official, r.access, r.moods, r.audiences,
      r.duration_bucket, r.budget_bucket, r.computed, r.stats,
      u.id as author_id, u.first_name as author_first_name, u.avatar_url as author_avatar_url,
      (select m.storage_path from media m
        where m.owner_type = 'route' and m.owner_id = r.id
        order by m.position limit 1) as cover,
      (select json_agg(json_build_object(
          'category', p.category,
          'lat', ST_Y(p.location::geometry),
          'lng', ST_X(p.location::geometry),
          'verified', p.verification_status = 'verified',
          'district', p.address_components->>'arrondissement',
          'neighborhood', p.address_components->>'neighborhood'
        ) order by s.position)
        from steps s join places p on p.id = s.place_id
        where s.route_id = r.id) as steps
    from page
    join routes r on r.id = page.id
    left join users u on u.id = r.author_id and u.deleted_at is null
    order by ${orderBy(keys)}
  `;
}

/** One page of cards, in the requested sort, after the cursor. */
export async function searchRoutes(
  db: Db,
  query: RouteSearchQuery,
): Promise<{ items: RouteCard[]; nextCursor: string | null }> {
  const keys = sortKeys(query.sort, query.near);
  const cursor = query.cursor
    ? decodeCursor(
        query.cursor,
        query.sort,
        keys.map((key) => key.type),
      )
    : undefined;
  const rows = await db.execute<CardRow>(searchPageSql(query, keys, cursor));

  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : [...rows];
  const last = pageRows.at(-1);
  const nextCursor =
    hasMore && last ? encodeCursor(query.sort, keyValuesOf(last, keys.length)) : null;
  return { items: pageRows.map(toCard), nextCursor };
}

/** Grid of 8 × 8 cells over the zone. */
const gridSize = 8;

/**
 * Clusters of a zone too large to list: routes grouped by the grid cell of their start, placed
 * at the mean of their starts. Same filters as the list, so the counts add up.
 */
export async function clusterRoutes(
  db: Db,
  query: Pick<RouteSearchQuery, 'bbox' | RouteFilterGroup>,
): Promise<RouteCluster[]> {
  const { west, south, east, north }: BBox = query.bbox;
  const cellLng = (east - west) / gridSize;
  const cellLat = (north - south) / gridSize;
  const x = sql`ST_X(${routes.startLocation}::geometry)`;
  const y = sql`ST_Y(${routes.startLocation}::geometry)`;
  const rows = await db.execute<{ count: number; lat: number; lng: number }>(sql`
    select count(*)::int as count, avg(${y})::float8 as lat, avg(${x})::float8 as lng
    from ${routes}
    where ${searchWhere(query)}
    group by floor((${x} - ${west}::float8) / ${cellLng}::float8),
      floor((${y} - ${south}::float8) / ${cellLat}::float8)
    order by count desc, lat, lng
    limit 200
  `);
  return rows.map(({ count, lat, lng }) => ({ center: { lat, lng }, count }));
}

/**
 * SQL of the count. With `all_but_one`, also the number without each active group, in the same
 * scan: `count(*) filter (where …)` per group, never per value.
 */
export function countSql(query: RouteCountQuery): SQL {
  const filters = activeFilters(query);
  if (query.breakdown !== 'all_but_one') {
    return sql`select count(*)::int as count from ${routes} where ${searchWhere(query)}`;
  }
  const groups = Object.keys(filters) as RouteFilterGroup[];
  const without = groups.map((group) => {
    const others = groups.flatMap((other) => {
      const predicate = filters[other];
      return other === group || !predicate ? [] : [predicate];
    });
    // Fixed identifiers of `routeFilterGroups`, never a client value.
    return sql`(count(*) filter (where ${allOf(others)}))::int as ${sql.raw(`"${group}"`)}`;
  });
  const all = sql`(count(*) filter (where ${allOf(Object.values(filters))}))::int as count`;
  return sql`select ${sql.join([all, ...without], sql`, `)} from ${routes} where ${inZone(query.bbox)}`;
}

/** Number of routes of the search, and without each active group on `all_but_one`. */
export async function countRoutes(db: Db, query: RouteCountQuery): Promise<RouteCount> {
  const [row] = await db.execute<Partial<Record<'count' | RouteFilterGroup, number>>>(
    countSql(query),
  );
  if (query.breakdown !== 'all_but_one') return { count: row?.count ?? 0 };
  const groups = Object.keys(activeFilters(query)) as RouteFilterGroup[];
  return {
    count: row?.count ?? 0,
    without: Object.fromEntries(groups.map((group) => [group, row?.[group] ?? 0])),
  };
}
