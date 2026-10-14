import type { ConfigContext } from 'expo/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import appConfig, { emailLinkHost, firebaseFiles, projectIdOf } from '../app.config';
import appJson from '../app.json';

// The Firebase files of the build (README › App mobile › Connexion): fictitious paths and
// project, never the real files.
const googleServices = JSON.stringify({ project_info: { project_id: 'widoo-test' } });

describe('Firebase files', () => {
  it('reads the paths of the EAS file variables first', () => {
    const files = firebaseFiles({
      env: { GOOGLE_SERVICES_JSON: '/eas/gs.json', GOOGLE_SERVICE_INFO_PLIST: '/eas/gs.plist' },
      projectRoot: '/app',
      exists: () => true,
      read: () => googleServices,
    });
    expect(files).toEqual({
      android: '/eas/gs.json',
      ios: '/eas/gs.plist',
      projectId: 'widoo-test',
    });
  });

  it('falls back on the folder ignored by git, and on nothing', () => {
    const files = firebaseFiles({
      env: {},
      projectRoot: '/app',
      exists: (file) => file === '/app/firebase/google-services.json',
      read: () => googleServices,
    });
    expect(files).toEqual({
      android: '/app/firebase/google-services.json',
      ios: null,
      projectId: 'widoo-test',
    });
  });

  it('reads the project only when it is a plain id', () => {
    expect(projectIdOf('not json')).toBeNull();
    expect(projectIdOf(JSON.stringify({ project_info: { project_id: 'a/b' } }))).toBeNull();
    expect(emailLinkHost('widoo-test')).toBe('widoo-test.firebaseapp.com');
  });
});

describe('app config', () => {
  const context = { config: appJson.expo } as unknown as ConfigContext;

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('adds the Firebase plugins to those of app.json', () => {
    const plugins = (appConfig(context).plugins ?? []).map((plugin) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );
    expect(plugins).toEqual(
      expect.arrayContaining([
        'expo-router',
        '@react-native-firebase/app',
        '@react-native-firebase/auth',
        '@react-native-google-signin/google-signin',
      ]),
    );
  });

  it('refuses an EAS build without its Firebase files', () => {
    vi.stubEnv('EAS_BUILD', 'true');
    vi.stubEnv('GOOGLE_SERVICES_JSON', '/nowhere/google-services.json');
    expect(() => appConfig(context)).toThrow(/GOOGLE_SERVICES_JSON/);
  });
});
