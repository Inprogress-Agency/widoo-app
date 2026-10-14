import { describe, expect, it } from 'vitest';
import { appVersionsOf } from './app-versions';

describe('appVersionsOf', () => {
  it('falls back on MIN_APP_VERSION for both platforms without a stored value', () => {
    const versions = { minVersion: '1.0.0', recommendedVersion: '1.0.0' };
    expect(appVersionsOf(undefined, '1.0.0')).toEqual({ ios: versions, android: versions });
  });

  it('reads each platform apart', () => {
    const stored = {
      ios: { minVersion: '1.1.0', recommendedVersion: '1.3.0' },
      android: { recommendedVersion: '1.2.0' },
    };
    expect(appVersionsOf(stored, '1.0.0')).toEqual({
      ios: { minVersion: '1.1.0', recommendedVersion: '1.3.0' },
      android: { minVersion: '1.0.0', recommendedVersion: '1.2.0' },
    });
  });

  it('ignores an invalid value and never recommends a build older than the minimum', () => {
    const stored = {
      ios: { minVersion: 'v2', recommendedVersion: 3 },
      android: { minVersion: '1.4.0', recommendedVersion: '1.2.0' },
    };
    expect(appVersionsOf(stored, '1.0.0')).toEqual({
      ios: { minVersion: '1.0.0', recommendedVersion: '1.0.0' },
      android: { minVersion: '1.4.0', recommendedVersion: '1.4.0' },
    });
    expect(appVersionsOf('nope', '1.0.0').ios.minVersion).toBe('1.0.0');
  });
});
