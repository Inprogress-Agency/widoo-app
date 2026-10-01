import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const base = { SITE_URL: 'https://widoo.example' };

describe('parseEnv', () => {
  it('reads the minimal environment with safe defaults', () => {
    expect(parseEnv(base)).toEqual({
      SITE_URL: 'https://widoo.example',
      SITE_ALIAS_HOSTS: [],
      SITE_INDEXABLE: false,
      APP_STORE_URL: undefined,
      PLAY_STORE_URL: undefined,
      WIDOO_API_URL: undefined,
    });
  });

  it('requires the site origin', () => {
    expect(() => parseEnv({})).toThrow(/SITE_URL/);
  });

  it('refuses an origin with a path or a trailing slash', () => {
    expect(() => parseEnv({ SITE_URL: 'https://widoo.example/' })).toThrow(/SITE_URL/);
    expect(() => parseEnv({ SITE_URL: 'https://widoo.example/fr' })).toThrow(/SITE_URL/);
  });

  it('splits and lowercases the alias hosts', () => {
    const env = parseEnv({ ...base, SITE_ALIAS_HOSTS: ' WWW.widoo.example, old.example ,' });
    expect(env.SITE_ALIAS_HOSTS).toEqual(['www.widoo.example', 'old.example']);
  });

  it('refuses an alias written as a URL', () => {
    expect(() => parseEnv({ ...base, SITE_ALIAS_HOSTS: 'https://www.widoo.example' })).toThrow(
      /SITE_ALIAS_HOSTS/,
    );
  });

  it('indexes the site only when asked explicitly', () => {
    expect(parseEnv({ ...base, SITE_INDEXABLE: 'true' }).SITE_INDEXABLE).toBe(true);
    expect(() => parseEnv({ ...base, SITE_INDEXABLE: 'yes' })).toThrow(/SITE_INDEXABLE/);
  });

  it('treats an empty store link as absent and requires https', () => {
    expect(parseEnv({ ...base, APP_STORE_URL: '' }).APP_STORE_URL).toBeUndefined();
    expect(() => parseEnv({ ...base, PLAY_STORE_URL: 'http://play.example' })).toThrow(
      /PLAY_STORE_URL/,
    );
  });

  it('reads the API origin, without path', () => {
    expect(parseEnv({ ...base, WIDOO_API_URL: 'https://api.example' }).WIDOO_API_URL).toBe(
      'https://api.example',
    );
    expect(() => parseEnv({ ...base, WIDOO_API_URL: 'https://api.example/v1' })).toThrow(
      /WIDOO_API_URL/,
    );
  });
});
