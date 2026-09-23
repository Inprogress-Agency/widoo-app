/**
 * Applies the pending migrations, then exits. `pnpm db:migrate` locally and in CI; in the image,
 * `node dist/migrate.js` (the build copies the migrations next to it). Each migration runs in a
 * transaction and is recorded in `drizzle.__drizzle_migrations`: a second run is a no-op.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config';
import { createSql } from './db/client';

const migrationsFolder = fileURLToPath(new URL('./db/generated/migrations', import.meta.url));
const sql = createSql(loadConfig(process.env).databaseUrl);
try {
  await migrate(drizzle({ client: sql }), { migrationsFolder });
  console.info('Database migrated');
} finally {
  await sql.end({ timeout: 5 });
}
