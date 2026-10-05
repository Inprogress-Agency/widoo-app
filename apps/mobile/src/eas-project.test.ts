import { describe, expect, it } from 'vitest';
import appJson from '../app.json';
import easJson from '../eas.json';

// The link to the EAS project and the build profiles (README › App mobile › Builds EAS). The
// owner and the project id are public; `eas init` rewrites app.json, so a rerun must keep them.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('EAS project', () => {
  it('links the app to the project of the Expo organization', () => {
    expect(appJson.expo.owner).toBe('inprogress-agency-team');
    expect(appJson.expo.extra.eas.projectId).toMatch(UUID);
  });

  it.each(['development', 'preview', 'production'] as const)(
    'builds the %s profile from the EAS environment of the same name',
    (profile) => {
      const build = easJson.build[profile];
      expect(build.environment).toBe(profile);
      expect(build.env.EXPO_PUBLIC_APP_ENV).toBe(profile);
    },
  );
});
