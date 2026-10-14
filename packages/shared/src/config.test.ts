import { describe, expect, it } from 'vitest';
import {
  AppConfig,
  defaultBucketThresholds,
  defaultCertificationThresholds,
  labels,
  taxonomies,
} from '.';

const config = {
  minAppVersion: '1.2.0',
  appVersions: {
    ios: { minVersion: '1.2.0', recommendedVersion: '1.3.0' },
    android: { minVersion: '1.2.0', recommendedVersion: '1.2.0' },
  },
  legal: { terms: '2026-09-28', privacy: '2026-09-28' },
  taxonomies,
  labels,
  thresholds: defaultBucketThresholds,
  anecdoteQuestions: [
    { key: 'hidden_gem', label: 'Un bon plan que personne ne connaît', position: 3 },
  ],
  certificationThresholds: defaultCertificationThresholds,
};

describe('AppConfig', () => {
  it('accepts the shared taxonomies, labels, thresholds and the anecdote questions', () => {
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
    const appVersions = { ...config.appVersions, android: { minVersion: '1.2.0' } };
    expect(AppConfig.safeParse({ ...config, appVersions }).success).toBe(false);
    const legal = { terms: 'v1', privacy: '2026-09-28' };
    expect(AppConfig.safeParse({ ...config, legal }).success).toBe(false);
  });
});
