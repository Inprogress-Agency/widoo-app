import { labels } from '@widoo/shared';
import { isPgEnum } from 'drizzle-orm/pg-core';
import { afterAll, describe, expect, it } from 'vitest';
import { testConfig } from '../test-config';
import { createSql } from './client';
import * as schema from './schema';

const enums = Object.values(schema as Record<string, unknown>).filter(isPgEnum);
const frenchLabels = new Set<string>(
  Object.values(labels.fr).flatMap((group) => Object.values(group)),
);

describe('database enums', () => {
  const sql = createSql(testConfig().databaseUrl);
  afterAll(() => sql.end());

  it.each(enums.map((e) => [e.enumName, e.enumValues] as const))(
    '%s holds snake_case keys, never a French label',
    (_, values) => {
      for (const value of values) {
        expect(value).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
        expect(frenchLabels.has(value)).toBe(false);
      }
    },
  );

  it('are the ones of the migrated database, in the same order', async () => {
    const rows = await sql<{ name: string; values: string[] }[]>`
      select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as values
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      group by t.typname`;
    expect(Object.fromEntries(rows.map((row) => [row.name, row.values]))).toEqual(
      Object.fromEntries(enums.map((e) => [e.enumName, e.enumValues])),
    );
  });
});
