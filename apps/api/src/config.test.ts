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
});
