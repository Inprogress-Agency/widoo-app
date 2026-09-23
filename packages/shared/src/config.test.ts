import { describe, expect, it } from 'vitest';
import { AppConfig, defaultBucketThresholds, labels, taxonomies } from '.';

const config = {
  minAppVersion: '1.2.0',
  taxonomies,
  labels,
  thresholds: defaultBucketThresholds,
};

describe('AppConfig', () => {
  it('accepts the shared taxonomies, labels and thresholds', () => {
    expect(AppConfig.parse(config)).toEqual(config);
  });

  it('drops a taxonomy added later so that an older build keeps parsing', () => {
    const parsed = AppConfig.parse({
      ...config,
      taxonomies: { ...taxonomies, seasons: ['summer'] },
    });
    expect(parsed.taxonomies).not.toHaveProperty('seasons');
  });

  it('rejects a missing taxonomy and a malformed version', () => {
    const withoutMoods = { ...taxonomies, moods: undefined };
    expect(AppConfig.safeParse({ ...config, taxonomies: withoutMoods }).success).toBe(false);
    expect(AppConfig.safeParse({ ...config, minAppVersion: '1.2' }).success).toBe(false);
  });
});
