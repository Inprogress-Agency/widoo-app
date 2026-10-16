import { describe, expect, it } from 'vitest';
import { boundsOf, formatSettingValue } from './setting-display';

describe('formatSettingValue', () => {
  it('writes a number with its unit and a French decimal comma', () => {
    expect(formatSettingValue({ key: 'premium.min_steps' }, 4)).toBe('4 étapes');
    expect(formatSettingValue({ key: 'certification.min_rating' }, 4.5)).toBe('4,5 / 5');
  });

  it('names each weight', () => {
    expect(
      formatSettingValue({ key: 'recommendation.weights' }, { proximity: 0.3, quality: 2 }),
    ).toBe('Proximité 0,3 · Qualité 2');
  });
});

describe('boundsOf', () => {
  it('says the range, or only the lower bound', () => {
    expect(boundsOf({ min: 1, max: 20 })).toBe('de 1 à 20');
    expect(boundsOf({ min: 0.1, max: null })).toBe('à partir de 0,1');
  });
});
