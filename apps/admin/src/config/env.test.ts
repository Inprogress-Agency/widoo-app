import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  NEXT_PUBLIC_API_URL: 'http://localhost:8080',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-widoo.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-widoo',
};

describe('parseEnv', () => {
  it('reads the origin of the API and the Firebase project', () => {
    expect(parseEnv(valid)).toEqual({
      ...valid,
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: undefined,
    });
  });

  it.each([
    ['a missing origin', undefined],
    ['a trailing slash', 'https://api.example/'],
    ['a path', 'https://api.example/v1'],
    ['another scheme', 'ftp://api.example'],
  ])('refuses %s for the API', (_, value) => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_API_URL: value })).toThrow(
      /Invalid admin environment/,
    );
  });

  it('refuses a missing Firebase project', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_FIREBASE_PROJECT_ID: undefined })).toThrow(
      /NEXT_PUBLIC_FIREBASE_PROJECT_ID/,
    );
  });

  it('accepts the Auth emulator with a demo project', () => {
    const env = parseEnv({
      ...valid,
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
    });
    expect(env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL).toBe('http://127.0.0.1:9099');
  });

  it('reads an empty emulator address as none', () => {
    const env = parseEnv({ ...valid, NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: '' });
    expect(env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL).toBeUndefined();
  });

  it('refuses the Auth emulator with a real project', () => {
    expect(() =>
      parseEnv({
        ...valid,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'widoo-staging',
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
      }),
    ).toThrow(/demo-\* project/);
  });
});
