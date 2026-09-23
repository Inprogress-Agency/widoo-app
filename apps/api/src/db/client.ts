import type { FastifyBaseLogger } from 'fastify';
import postgres from 'postgres';

/**
 * Connection pool, created once per process. Drizzle wraps this same client
 * (`drizzle(sql)` from `drizzle-orm/postgres-js`); queries stay parameterized.
 */
export type Sql = postgres.Sql;

export function createSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 10,
    // Fail fast so that /health answers while the database is unreachable.
    connect_timeout: 5,
    idle_timeout: 60,
    onnotice: () => {},
  });
}

/** True when the database answers a trivial query. */
export async function isDatabaseUp(sql: Sql, log: FastifyBaseLogger): Promise<boolean> {
  try {
    await sql`select 1`;
    return true;
  } catch (error) {
    log.warn({ err: error }, 'database unreachable');
    return false;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    sql: Sql;
  }
}
