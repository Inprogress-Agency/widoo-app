import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const databaseUrl = 'postgres://widoo:widoo@localhost:5432/widoo';

describe('loadConfig', () => {
  it('applies the defaults', () => {
    expect(loadConfig({ DATABASE_URL: databaseUrl })).toEqual({
      isProduction: false,
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'info',
      databaseUrl,
      minAppVersion: '0.0.0',
      corsOrigins: [],
      trustedProxies: [],
      rateLimitMax: 1000,
      firebaseProjectId: undefined,
      sentryDsn: undefined,
      sentryEnvironment: 'development',
    });
  });

  it('reads the Sentry DSN and environment, an empty DSN meaning none', () => {
    const load = (env: Record<string, string>) => loadConfig({ DATABASE_URL: databaseUrl, ...env });
    const dsn = 'https://public@o0.ingest.de.sentry.io/0';
    expect(load({ SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: 'staging' })).toMatchObject({
      sentryDsn: dsn,
      sentryEnvironment: 'staging',
    });
    expect(load({ SENTRY_DSN: '', NODE_ENV: 'test' })).toMatchObject({
      sentryDsn: undefined,
      sentryEnvironment: 'test',
    });
    expect(() => load({ SENTRY_DSN: 'not a url' })).toThrow(/SENTRY_DSN/);
    const plain = 'http://public@localhost:9000/1';
    expect(load({ SENTRY_DSN: plain }).sentryDsn).toBe(plain);
    expect(() => load({ SENTRY_DSN: plain, NODE_ENV: 'production' })).toThrow(/HTTPS/);
  });

  it('names an invalid variable without echoing its value', () => {
    const load = () => loadConfig({ DATABASE_URL: 'mysql://user:fictitious-secret@db/widoo' });
    expect(load).toThrow(/DATABASE_URL/);
    expect(load).not.toThrow(/fictitious-secret/);
  });

  it('rejects a missing database URL, a port out of range and a malformed app version', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: databaseUrl, PORT: '70000' })).toThrow(/PORT/);
    expect(() => loadConfig({ DATABASE_URL: databaseUrl, MIN_APP_VERSION: 'v1' })).toThrow(
      /MIN_APP_VERSION/,
    );
  });

  it('parses the CORS origins and trusted proxies as lists', () => {
    const config = loadConfig({
      DATABASE_URL: databaseUrl,
      CORS_ORIGINS: 'https://admin.example.com, http://localhost:5173',
      TRUST_PROXY: 'linklocal,10.0.0.0/8',
    });
    expect(config.corsOrigins).toEqual(['https://admin.example.com', 'http://localhost:5173']);
    expect(config.trustedProxies).toEqual(['linklocal', '10.0.0.0/8']);
  });

  it('rejects an origin with a path and a malformed proxy', () => {
    const load = (env: Record<string, string>) => () =>
      loadConfig({ DATABASE_URL: databaseUrl, ...env });
    expect(load({ CORS_ORIGINS: 'https://admin.example.com/login' })).toThrow(/CORS_ORIGINS/);
    expect(load({ CORS_ORIGINS: 'admin.example.com' })).toThrow(/CORS_ORIGINS/);
    expect(load({ TRUST_PROXY: 'any' })).toThrow(/TRUST_PROXY/);
  });

  it('reads the Firebase project ID and rejects a malformed one', () => {
    const load = (projectId: string) =>
      loadConfig({ DATABASE_URL: databaseUrl, FIREBASE_PROJECT_ID: projectId });
    expect(load('widoo-staging').firebaseProjectId).toBe('widoo-staging');
    expect(() => load('Widoo Staging')).toThrow(/FIREBASE_PROJECT_ID/);
  });

  it('refuses the Auth emulator and demo projects in production only', () => {
    const load = (env: Record<string, string>) => () =>
      loadConfig({ DATABASE_URL: databaseUrl, FIREBASE_PROJECT_ID: 'widoo-prod', ...env });
    const emulator = { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' };
    const demo = { FIREBASE_PROJECT_ID: 'demo-widoo' };
    expect(load({ NODE_ENV: 'production', ...emulator })).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/);
    expect(load({ NODE_ENV: 'production', ...demo })).toThrow(/FIREBASE_PROJECT_ID/);
    expect(load({ NODE_ENV: 'production' })).not.toThrow();
    expect(load({ NODE_ENV: 'development', ...emulator, ...demo })).not.toThrow();
  });
});
