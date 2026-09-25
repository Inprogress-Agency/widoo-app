/**
 * SQL predicates of the route search (wiki Modele-de-Donnees › requête centrale). Every value is
 * a bound parameter: the keys come from the taxonomies through `RouteSearchQuery`, and only the
 * fixed type names below are written into the SQL text.
 */
import type { RouteFilterGroup, RouteSearchQuery } from '@widoo/shared';
import { and, sql, type SQL } from 'drizzle-orm';
import type { BBox } from '../db/geography';
import { routes } from '../db/schema';

/** `array[$1, $2]::type[]`, one parameter per value. */
function arrayOf(
  values: readonly string[],
  type: 'text' | 'duration_bucket' | 'budget_bucket' | 'transport',
) {
  const items = sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
  return sql`array[${items}]::${sql.raw(type)}[]`;
}

/**
 * Operator of each group (wiki Filtres-et-Recherche › logique de combinaison): at least one
 * public or ambiance (`&&`, GIN), every condition (`@>`, GIN), one of the buckets or transports.
 */
const groupPredicates: Record<RouteFilterGroup, (values: string[]) => SQL> = {
  audiences: (values) => sql`${routes.audiences} && ${arrayOf(values, 'text')}`,
  moods: (values) => sql`${routes.moods} && ${arrayOf(values, 'text')}`,
  conditions: (values) => sql`${routes.conditions} @> ${arrayOf(values, 'text')}`,
  durations: (values) => sql`${routes.durationBucket} = any(${arrayOf(values, 'duration_bucket')})`,
  budgets: (values) => sql`${routes.budgetBucket} = any(${arrayOf(values, 'budget_bucket')})`,
  transports: (values) => sql`${routes.transport} = any(${arrayOf(values, 'transport')})`,
};

export type RouteFilters = Pick<RouteSearchQuery, RouteFilterGroup>;

/** Predicate of each active group, in the order of `groupPredicates`; an empty group is inactive. */
export function activeFilters(query: RouteFilters): Partial<Record<RouteFilterGroup, SQL>> {
  const active: Partial<Record<RouteFilterGroup, SQL>> = {};
  for (const [group, predicate] of Object.entries(groupPredicates) as [
    RouteFilterGroup,
    (values: string[]) => SQL,
  ][]) {
    const values = query[group];
    if (values && values.length > 0) active[group] = predicate(values);
  }
  return active;
}

/** `true` when no group is active, so that the predicate always composes with `and`. */
export function allOf(predicates: readonly SQL[]): SQL {
  return and(...predicates) ?? sql`true`;
}

/**
 * Published routes a card can show: a start, a computed duration and budget. A route belongs to
 * the zone when its envelope intersects it (GiST on `routes.bounds`).
 */
export function inZone(bbox: BBox): SQL {
  const { west, south, east, north } = bbox;
  return allOf([
    sql`${routes.status} = 'published'`,
    sql`${routes.startLocation} is not null`,
    sql`${routes.computed} is not null`,
    sql`${routes.durationBucket} is not null`,
    sql`${routes.budgetBucket} is not null`,
    sql`ST_Intersects(${routes.bounds}, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)::geography)`,
  ]);
}

/** Surface of a zone in km², on a sphere: enough to tell a district from a region. */
export function areaKm2({ west, south, east, north }: BBox): number {
  const radiusKm = 6371.0088;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  return (
    radiusKm ** 2 *
    toRadians(east - west) *
    Math.abs(Math.sin(toRadians(north)) - Math.sin(toRadians(south)))
  );
}
