import { describe, expect, it } from 'vitest';
import { sheetTransitionOf } from './build';

describe('sheetTransitionOf', () => {
  it('serves the line of a trip the provider computed, for this answer only (D-088)', () => {
    const exact = { distanceM: 820, durationMin: 11, mode: 'walk', estimated: false } as const;
    expect(sheetTransitionOf({ ...exact, geometry: 'a~l~Fjk~uOwHJ' })).toEqual({
      ...exact,
      geometry: 'a~l~Fjk~uOwHJ',
    });
  });

  it('serves our estimate without a line when the provider did not answer', () => {
    const estimated = { distanceM: 820, durationMin: 11, mode: 'bike', estimated: true } as const;
    expect(sheetTransitionOf(estimated)).toEqual({ ...estimated, geometry: null });
  });

  it('says the metro is estimated, never asked of the provider', () => {
    const metro = { distanceM: 4200, durationMin: 21, mode: 'metro', estimated: false } as const;
    expect(sheetTransitionOf(metro)).toEqual({ ...metro, estimated: true, geometry: null });
  });

  it('serves no trip after the last step', () => {
    expect(sheetTransitionOf(null)).toBeNull();
  });
});
