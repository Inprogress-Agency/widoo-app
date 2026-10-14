import { describe, expect, it } from 'vitest';
import { defaultCoherenceThresholds } from './evaluate';
import { coherenceSettingKeys, coherenceThresholdsOf } from './settings';

describe('coherenceThresholdsOf', () => {
  it('keeps the thresholds of the wiki without any row', () => {
    expect(coherenceThresholdsOf({})).toEqual(defaultCoherenceThresholds);
  });

  it('reads each threshold from its key', () => {
    const thresholds = coherenceThresholdsOf({
      'coherence.max_steps': 12,
      'coherence.walk_transition_max_min': 25,
      'coherence.travel_share_max': 0.5,
      'coherence.back_and_forth_max': 0.3,
    });
    expect(thresholds).toEqual({
      ...defaultCoherenceThresholds,
      maxSteps: 12,
      walkTransitionMaxMin: 25,
      travelShareMax: 0.5,
      backAndForthMax: 0.3,
    });
  });

  it('falls back on its own for a value missing or invalid', () => {
    const thresholds = coherenceThresholdsOf({
      'coherence.min_steps': 2.5,
      'coherence.total_max_min': -1,
      'coherence.travel_share_max': 1.5,
      'coherence.description_min_length': '80',
      'coherence.other_transition_max_min': 50,
    });
    expect(thresholds).toEqual({ ...defaultCoherenceThresholds, otherTransitionMaxMin: 50 });
  });

  it('falls back on both bounds of a pair that no longer holds', () => {
    const thresholds = coherenceThresholdsOf({
      'coherence.min_steps': 5,
      'coherence.max_steps': 4,
      'coherence.step_min_duration_min': 400,
    });
    expect(thresholds).toEqual(defaultCoherenceThresholds);
  });

  it('has one key for each threshold', () => {
    expect(Object.keys(coherenceSettingKeys).sort()).toEqual(
      Object.keys(defaultCoherenceThresholds).sort(),
    );
    expect(new Set(Object.values(coherenceSettingKeys)).size).toBe(
      Object.keys(coherenceSettingKeys).length,
    );
  });
});
