import { describe, expect, it } from 'vitest';
import { defaultWeights, scoreOf, weightsOf } from './weights';

describe('weights', () => {
  it('are those of the wiki by default', () => {
    expect(weightsOf(undefined)).toEqual({
      proximity: 0.3,
      quality: 0.25,
      reliability: 0.2,
      freshness: 0.1,
      context: 0.1,
      official: 0.05,
    });
  });

  it('take the weights of settings over the defaults, even in part', () => {
    expect(weightsOf({ quality: 0.5, official: 0 })).toEqual({
      ...defaultWeights,
      quality: 0.5,
      official: 0,
    });
  });

  it.each([
    ['an unknown component', { popularity: 1 }],
    ['a negative weight', { quality: -1 }],
    ['a weight above 10', { quality: 11 }],
    ['a string', { quality: '0.5' }],
    ['all weights at zero', Object.fromEntries(Object.keys(defaultWeights).map((k) => [k, 0]))],
    ['an array', [0.3]],
  ])('fall back to the defaults on %s', (_, value) => {
    expect(weightsOf(value)).toEqual(defaultWeights);
  });
});

describe('score', () => {
  it('is the weighted sum of the components', () => {
    const components = {
      proximity: 1,
      quality: 0.5,
      reliability: 1,
      freshness: 0,
      context: 0.5,
      official: 1,
    };
    expect(scoreOf(components, defaultWeights)).toBeCloseTo(0.3 + 0.125 + 0.2 + 0 + 0.05 + 0.05);
  });
});
