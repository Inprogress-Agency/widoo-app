/**
 * Database of the integration tests. CI provides DATABASE_URL (its ephemeral PostGIS service);
 * locally, `widoo_test` on the `docker compose` server, created and migrated by the Vitest global
 * setup (`test-global-setup.ts`), so that `pnpm test` never writes to `widoo`, used by `pnpm dev`.
 */
export const localTestDatabaseUrl = 'postgres://widoo:widoo@localhost:5432/widoo_test';

/** Test databases are named `*_test`: a DATABASE_URL pointing elsewhere is refused. */
export function testDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = env.DATABASE_URL ?? localTestDatabaseUrl;
  const name = URL.canParse(url) ? decodeURIComponent(new URL(url).pathname.slice(1)) : '';
  if (!name.endsWith('_test')) {
    // The name only: the URL may hold a password.
    throw new Error(
      `Integration tests run on a database named *_test, not "${name}": unset DATABASE_URL to use widoo_test`,
    );
  }
  return url;
}
