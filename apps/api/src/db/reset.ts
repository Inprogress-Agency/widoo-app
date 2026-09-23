/**
 * First step of `pnpm db:reset` (then db:migrate and db:seed): drops every table, type and
 * extension of the database, and the migration journal. Local databases only, never production.
 */
import { loadConfig } from '../config';
import { createSql } from './client';

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

const config = loadConfig(process.env);
const host = new URL(config.databaseUrl).hostname;
if (config.isProduction || !localHosts.has(host)) {
  throw new Error('db:reset drops the database: local databases only, never NODE_ENV=production');
}
const sql = createSql(config.databaseUrl);
try {
  await sql`drop schema if exists drizzle cascade`;
  await sql`drop schema public cascade`;
  await sql`create schema public`;
  console.info('Database emptied');
} finally {
  await sql.end({ timeout: 5 });
}
