import { loadConfig } from './config';

// CI provides DATABASE_URL (PostGIS service); locally, `docker compose up -d`.
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://widoo:widoo@localhost:5432/widoo';

/** Configuration of the integration tests: silent logs, local or CI database. */
export const testConfig = (env: Record<string, string> = {}) =>
  loadConfig({ DATABASE_URL: databaseUrl, LOG_LEVEL: 'silent', ...env });
