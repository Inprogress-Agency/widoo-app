/**
 * Versions of the app builds (E-20, D-063): at launch, the app compares its own version with the
 * `minVersion` and `recommendedVersion` of its platform in `GET /config`.
 */

/** Platforms of the app; each store ships its builds apart. */
export const appPlatforms = ['ios', 'android'] as const;
export type AppPlatform = (typeof appPlatforms)[number];

/** `major.minor.patch`, the format `AppVersion` validates. */
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

function partsOf(version: string): [number, number, number] {
  const match = VERSION.exec(version);
  if (!match) {
    throw new Error(`Expected major.minor.patch, got ${JSON.stringify(version)}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Negative when `a` is older than `b`, 0 when equal, positive when newer; numeric per part. */
export function compareAppVersions(a: string, b: string): number {
  const left = partsOf(a);
  const right = partsOf(b);
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * What E-20 shows to a build: `required` under `minVersion` (full screen, no way out),
 * `recommended` under `recommendedVersion` (a sheet the user can close), `none` otherwise.
 */
export type AppUpdate = 'required' | 'recommended' | 'none';

export function appUpdateOf(
  current: string,
  versions: { minVersion: string; recommendedVersion: string },
): AppUpdate {
  if (compareAppVersions(current, versions.minVersion) < 0) return 'required';
  if (compareAppVersions(current, versions.recommendedVersion) < 0) return 'recommended';
  return 'none';
}
