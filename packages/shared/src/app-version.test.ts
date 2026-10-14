import { describe, expect, it } from 'vitest';
import { appUpdateOf, compareAppVersions } from '.';

describe('compareAppVersions', () => {
  it.each([
    ['1.2.0', '1.2.0', 0],
    ['1.2.0', '1.10.0', -1],
    ['2.0.0', '1.99.99', 1],
    ['1.2.3', '1.2.10', -1],
  ])('compares %s with %s part by part, as numbers', (a, b, sign) => {
    expect(Math.sign(compareAppVersions(a, b))).toBe(sign);
  });

  it('refuses a version that is not major.minor.patch', () => {
    expect(() => compareAppVersions('1.2', '1.2.0')).toThrow(/major\.minor\.patch/);
  });
});

describe('appUpdateOf', () => {
  const versions = { minVersion: '1.2.0', recommendedVersion: '1.4.0' };

  it.each([
    ['1.1.9', 'required'],
    ['1.2.0', 'recommended'],
    ['1.3.5', 'recommended'],
    ['1.4.0', 'none'],
    ['2.0.0', 'none'],
  ])('tells E-20 what to show to %s', (current, update) => {
    expect(appUpdateOf(current, versions)).toBe(update);
  });
});
