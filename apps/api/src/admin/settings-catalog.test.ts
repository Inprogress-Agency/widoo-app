import { defaultWeights } from '../recommendation/weights';
import { describe, expect, it } from 'vitest';
import {
  definitionOf,
  effectiveValueOf,
  isValidSettingValue,
  settingDefinitions,
} from './settings-catalog';

const definition = (key: string) => {
  const found = definitionOf(key);
  if (!found) throw new Error(`No definition for ${key}`);
  return found;
};

describe('isValidSettingValue', () => {
  it('holds a count to whole numbers within its bounds', () => {
    const steps = definition('premium.min_steps');
    expect(isValidSettingValue(steps, 5)).toBe(true);
    expect(isValidSettingValue(steps, 0)).toBe(false);
    expect(isValidSettingValue(steps, 21)).toBe(false);
    expect(isValidSettingValue(steps, 4.5)).toBe(false);
    expect(isValidSettingValue(steps, '5')).toBe(false);
    expect(isValidSettingValue(steps, Number.NaN)).toBe(false);
  });

  it('lets a decimal setting hold a fraction, within its bounds', () => {
    const rating = definition('certification.min_rating');
    expect(isValidSettingValue(rating, 4.5)).toBe(true);
    expect(isValidSettingValue(rating, 5.1)).toBe(false);
    expect(isValidSettingValue(rating, -1)).toBe(false);
  });

  it('accepts weights of known components, not all zero', () => {
    const weights = definition('recommendation.weights');
    expect(isValidSettingValue(weights, { proximity: 2, quality: 0 })).toBe(true);
    expect(isValidSettingValue(weights, { proximity: 0, quality: 0 })).toBe(false);
    expect(isValidSettingValue(weights, { luck: 1 })).toBe(false);
    expect(isValidSettingValue(weights, { proximity: 11 })).toBe(false);
    expect(isValidSettingValue(weights, {})).toBe(false);
    expect(isValidSettingValue(weights, [1])).toBe(false);
    expect(isValidSettingValue(weights, 3)).toBe(false);
  });
});

describe('effectiveValueOf', () => {
  it('falls back to the default for a missing or invalid row', () => {
    const steps = definition('premium.min_steps');
    expect(effectiveValueOf(steps, undefined)).toBe(steps.default);
    expect(effectiveValueOf(steps, 'many')).toBe(steps.default);
  });

  it('completes partial weights with the defaults', () => {
    const weights = definition('recommendation.weights');
    expect(effectiveValueOf(weights, { proximity: 1 })).toEqual({
      ...defaultWeights,
      proximity: 1,
    });
  });
});

describe('settingDefinitions', () => {
  it('has a default valid for its own key, and each key once', () => {
    for (const setting of settingDefinitions) {
      expect(isValidSettingValue(setting, setting.default)).toBe(true);
    }
    expect(new Set(settingDefinitions.map((setting) => setting.key)).size).toBe(
      settingDefinitions.length,
    );
  });
});
