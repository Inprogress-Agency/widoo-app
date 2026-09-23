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
    });
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
});
