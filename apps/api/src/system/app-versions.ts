import {
  AppVersion,
  appPlatforms,
  compareAppVersions,
  type AppVersions,
  type PlatformVersions,
} from '@widoo/shared';
import { z } from 'zod';
import type { Db } from '../db/client';
import { createCachedSetting, readSetting } from '../search/settings';

/**
 * Key of the `settings` row of the build versions (E-20, D-063), changed by the team at each
 * release without a deployment: `{ ios: { minVersion, recommendedVersion }, android: … }`, every
 * key optional.
 */
export const appVersionsKey = 'app.versions';

const StoredPlatform = z.object({
  minVersion: AppVersion.optional().catch(undefined),
  recommendedVersion: AppVersion.optional().catch(undefined),
});

/**
 * Versions of each platform from the stored value: a missing or invalid `minVersion` is
 * `MIN_APP_VERSION`, a missing or invalid `recommendedVersion` is the minimum, and a recommended
 * version older than the minimum is raised to it.
 */
export function appVersionsOf(stored: unknown, minAppVersion: string): AppVersions {
  const value = z.record(z.string(), z.unknown()).catch({}).parse(stored);
  const of = (platform: string): PlatformVersions => {
    const parsed = StoredPlatform.catch({}).parse(value[platform]);
    const minVersion = parsed.minVersion ?? minAppVersion;
    const recommended = parsed.recommendedVersion ?? minVersion;
    return {
      minVersion,
      recommendedVersion:
        compareAppVersions(recommended, minVersion) < 0 ? minVersion : recommended,
    };
  };
  return Object.fromEntries(
    appPlatforms.map((platform) => [platform, of(platform)]),
  ) as AppVersions;
}

/** The versions read from `settings` and kept one minute per process. */
export function createAppVersions(
  db: Db,
  minAppVersion: string,
  now: () => number = () => Date.now(),
): () => Promise<AppVersions> {
  return createCachedSetting(
    () => readSetting(db, appVersionsKey),
    (stored) => appVersionsOf(stored, minAppVersion),
    now,
  );
}
