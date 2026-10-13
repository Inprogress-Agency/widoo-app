import {
  catalogPageSize,
  type CatalogRoute,
  type CatalogRoutes,
  type CatalogRoutesQuery,
  type CatalogRouteSort,
} from '@widoo/shared';
import { sql, type SQL } from 'drizzle-orm';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import type { Db } from '../db/client';
import { ratingOf } from '../db/route-stats';

type RouteRow = {
  id: string;
  title: string;
  status: CatalogRoute['status'];
  access: CatalogRoute['access'];
  is_official: boolean;
  author_id: string | null;
  author_first_name: string | null;
  city_name: string;
  stats: unknown;
  updated_at: Date;
};

const sortExpressions: Record<CatalogRouteSort, SQL> = {
  updated: sql`r.updated_at`,
  title: sql`lower(r.title)`,
  author: sql`lower(coalesce(u.first_name, ''))`,
  city: sql`lower(c.name)`,
  // Routes without a rating last, whatever the direction.
  rating: sql`(r.stats ->> 'rating_avg')::numeric`,
};

/** `%` and `_` typed in the search are searched as they are, not read as wildcards. */
const likePattern = (text: string) => `%${text.replaceAll(/[\\%_]/g, '\\$&')}%`;

export type CatalogScope = {
  /** An editor only sees the routes of the team (wiki Admin-Web › Rôles). */
  isTeamOnly: boolean;
};

function filtersOf(query: CatalogRoutesQuery, scope: CatalogScope): SQL {
  const filters: SQL[] = [sql`true`];
  if (scope.isTeamOnly) {
    filters.push(sql`r.is_official`);
  }
  if (query.status) {
    filters.push(sql`r.status = ${query.status}`);
  }
  if (query.access) {
    filters.push(sql`r.access = ${query.access}`);
  }
  if (query.q) {
    const pattern = likePattern(query.q);
    filters.push(sql`(r.title ilike ${pattern} or u.first_name ilike ${pattern})`);
  }
  return sql.join(filters, sql` and `);
}

const toRoute = (row: RouteRow): CatalogRoute => ({
  id: row.id,
  title: row.title,
  status: row.status,
  access: row.access,
  isOfficial: row.is_official,
  author: row.author_id ? { id: row.author_id, firstName: row.author_first_name } : null,
  cityName: row.city_name,
  rating: ratingOf(row.stats),
  updatedAt: new Date(row.updated_at).toISOString(),
});

/** A page of the routes of the catalog (A-04), whatever their status. */
export async function readCatalogRoutes(
  db: Db,
  query: CatalogRoutesQuery,
  scope: CatalogScope,
): Promise<CatalogRoutes> {
  const offset = offsetOfCursor(query.cursor);
  const where = filtersOf(query, scope);
  const direction = query.direction === 'desc' ? sql`desc` : sql`asc`;
  const from = sql`from routes r
    join cities c on c.id = r.city_id
    left join users u on u.id = r.author_id and u.deleted_at is null`;

  const rows = await db.execute<RouteRow>(sql`
    select r.id, r.title, r.status, r.access, r.is_official, r.stats, r.updated_at,
      u.id as author_id, u.first_name as author_first_name, c.name as city_name
    ${from}
    where ${where}
    order by ${sortExpressions[query.sort]} ${direction} nulls last, r.id
    limit ${catalogPageSize} offset ${offset}`);
  const [counted] = await db.execute<{ total: number }>(
    sql`select count(*)::int as total ${from} where ${where}`,
  );
  const total = counted?.total ?? 0;

  return {
    items: rows.map(toRoute),
    total,
    offset,
    ...neighbourCursors(offset, total, catalogPageSize),
  };
}
