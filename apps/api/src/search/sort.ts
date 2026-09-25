import type { LatLng, RouteSort } from '@widoo/shared';
import { sql, type SQL } from 'drizzle-orm';
import { places, routes, steps } from '../db/schema';
import type { SortKeyType, SortKeyValue } from './cursor';

/** One column of a sort. Never null, so that a row comparison always decides. */
export type SortKey = { expr: SQL; direction: 'asc' | 'desc'; type: SortKeyType };

const id = (direction: SortKey['direction']): SortKey => ({
  expr: sql`${routes.id}`,
  direction,
  type: 'uuid',
});

/**
 * Sort keys of each sort, the route id last to break ties. `recommended` waits for the
 * recommendation score (#63): verified places, then official routes, then the most recent
 * (wiki Modele-de-Donnees › requête centrale).
 */
export function sortKeys(sort: RouteSort, near: LatLng | undefined): SortKey[] {
  switch (sort) {
    case 'recommended':
      return [
        {
          expr: sql`(select count(*)::int from ${steps} join ${places} on ${places.id} = ${steps.placeId} where ${steps.routeId} = ${routes.id} and ${places.verificationStatus} = 'verified')`,
          direction: 'desc',
          type: 'int',
        },
        { expr: sql`${routes.isOfficial}::int`, direction: 'desc', type: 'int' },
        {
          // Microseconds: a JavaScript date would round them and skip or repeat a route.
          expr: sql`coalesce((extract(epoch from ${routes.publishedAt}) * 1000000)::bigint, 0)`,
          direction: 'desc',
          type: 'bigint',
        },
        id('desc'),
      ];
    case 'distance': {
      // `RouteSearchQuery` requires `near` with this sort.
      const { lat, lng } = near ?? { lat: 0, lng: 0 };
      return [
        {
          expr: sql`ST_Distance(${routes.startLocation}, ST_MakePoint(${lng}::float8, ${lat}::float8)::geography)`,
          direction: 'asc',
          type: 'float8',
        },
        id('asc'),
      ];
    }
    case 'duration':
      return [
        {
          expr: sql`coalesce((${routes.computed}->>'duration_min')::int, 0)`,
          direction: 'asc',
          type: 'int',
        },
        id('asc'),
      ];
    case 'rating':
      return [
        {
          expr: sql`coalesce((${routes.stats}->>'rating_avg')::float8, 0)`,
          direction: 'desc',
          type: 'float8',
        },
        {
          expr: sql`coalesce((${routes.stats}->>'rating_count')::int, 0)`,
          direction: 'desc',
          type: 'int',
        },
        id('desc'),
      ];
  }
}

/** Name of the column holding the key `index` in the search query. */
export const keyColumn = (index: number) => sql.raw(`k${index}`);

/** `order by k0 desc, k1 desc…` */
export function orderBy(keys: readonly SortKey[]): SQL {
  return sql.join(
    keys.map((key, index) => sql`${keyColumn(index)} ${sql.raw(key.direction)}`),
    sql`, `,
  );
}

/**
 * Rows after the cursor: `k0 > v0 or (k0 = v0 and k1 > v1) or …`, each comparison in the
 * direction of its key, each value a parameter cast to the key type.
 */
export function after(keys: readonly SortKey[], values: readonly SortKeyValue[]): SQL {
  const value = (index: number) => sql`${values[index]}::${sql.raw(keys[index]?.type ?? 'text')}`;
  const branches = keys.map((key, index) => {
    const equalities = keys
      .slice(0, index)
      .map((_, before) => sql`${keyColumn(before)} = ${value(before)}`);
    const operator = sql.raw(key.direction === 'asc' ? '>' : '<');
    return sql.join(
      [...equalities, sql`${keyColumn(index)} ${operator} ${value(index)}`],
      sql` and `,
    );
  });
  return sql`(${sql.join(
    branches.map((branch) => sql`(${branch})`),
    sql` or `,
  )})`;
}
