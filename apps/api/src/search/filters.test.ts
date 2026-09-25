import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { activeFilters, allOf, areaKm2, inZone } from './filters';
import { after, sortKeys } from './sort';

const render = (query: Parameters<PgDialect['sqlToQuery']>[0]) => new PgDialect().sqlToQuery(query);

describe('search predicates', () => {
  it('bind every filter value and bbox coordinate as a parameter', () => {
    const filters = activeFilters({ moods: ['food', 'culture'], budgets: ['high'] });
    const { sql, params } = render(
      allOf([
        inZone({ west: 2.33, south: 48.85, east: 2.37, north: 48.87 }),
        ...Object.values(filters),
      ]),
    );
    expect(Object.keys(filters)).toEqual(['moods', 'budgets']);
    expect(sql).toContain('"routes"."moods" && array[$5, $6]::text[]');
    expect(sql).toContain('"routes"."budget_bucket" = any(array[$7]::budget_bucket[])');
    expect(sql).not.toMatch(/food|culture|high|2\.33/);
    expect(params).toEqual([2.33, 48.85, 2.37, 48.87, 'food', 'culture', 'high']);
  });

  it('treat an empty group as inactive', () => {
    expect(activeFilters({ moods: [], conditions: undefined })).toEqual({});
  });

  it('bind the cursor values after the sort keys', () => {
    const keys = sortKeys('rating', undefined);
    const { sql, params } = render(after(keys, [4.5, 12, '01997a4e-8c00-7000-8000-000000000100']));
    expect(sql).toBe(
      '((k0 < $1::float8) or (k0 = $2::float8 and k1 < $3::int) or (k0 = $4::float8 and k1 = $5::int and k2 < $6::uuid))',
    );
    expect(params).toEqual([4.5, 4.5, 12, 4.5, 12, '01997a4e-8c00-7000-8000-000000000100']);
  });
});

describe('areaKm2', () => {
  it('measures a zone of Paris', () => {
    // About 18 km by 9.6 km.
    expect(areaKm2({ west: 2.2241, south: 48.8156, east: 2.4699, north: 48.9022 })).toBeCloseTo(
      173,
      -1,
    );
    expect(areaKm2({ west: 2.35, south: 48.85, east: 2.37, north: 48.87 })).toBeLessThan(4);
  });
});
