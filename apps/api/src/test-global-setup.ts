/**
 * Vitest global setup of the API, run once before the tests: creates the test database when it
 * is missing (a fresh local server), then applies the pending migrations, a no-op when it is up
 * to date (CI has already migrated it). Drop `widoo_test` to start again from an empty database.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { createSql } from './db/client';
import { testDatabaseUrl } from './test-database';

// Same path as in migrate.ts, which `pnpm db:migrate` runs.
const migrationsFolder = fileURLToPath(new URL('./db/generated/migrations', import.meta.url));

const invalidCatalogName = '3D000';
const duplicateDatabase = '42P04';

const hasCode = (error: unknown, code: string) =>
  error instanceof Error && 'code' in error && error.code === code;

async function createDatabaseIfMissing(databaseUrl: string): Promise<void> {
  const sql = createSql(databaseUrl);
  try {
    await sql`select 1`;
    return;
  } catch (error) {
    if (!hasCode(error, invalidCatalogName)) {
      throw error;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
  // Created from the maintenance database of the same server.
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const admin = createSql(url.href);
  try {
    await admin`create database ${admin(name)}`;
    console.info(`Test database ${name} created`);
  } catch (error) {
    if (!hasCode(error, duplicateDatabase)) {
      throw error;
    }
  } finally {
    await admin.end({ timeout: 5 });
  }
}

export default async function setup(): Promise<void> {
  const databaseUrl = testDatabaseUrl();
  await createDatabaseIfMissing(databaseUrl);
  const sql = createSql(databaseUrl);
  try {
    await migrate(drizzle({ client: sql }), { migrationsFolder });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
