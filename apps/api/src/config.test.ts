import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('applies the defaults', () => {
    expect(loadConfig({})).toEqual({
      isProduction: false,
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'info',
    });
  });

  it('names an invalid variable without echoing its value', () => {
    const load = () => loadConfig({ LOG_LEVEL: 'fictitious-secret' });
    expect(load).toThrow(/LOG_LEVEL/);
    expect(load).not.toThrow(/fictitious-secret/);
  });

  it('rejects a port out of range', () => {
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/);
  });
});
