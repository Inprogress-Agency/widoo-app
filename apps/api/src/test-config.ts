import { loadConfig } from './config';
import { testDatabaseUrl } from './test-database';

const databaseUrl = testDatabaseUrl();

/** Configuration of the integration tests: silent logs, test database, demo Firebase project. */
export const testConfig = (env: Record<string, string> = {}) =>
  loadConfig({
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: 'silent',
    FIREBASE_PROJECT_ID: 'demo-widoo-test',
    ...env,
  });
