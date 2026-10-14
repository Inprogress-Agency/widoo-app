import type { Transition } from '@widoo/orchestration';
import { describe, expect, it } from 'vitest';
import { mainTransportOf } from './content';

const trip = (mode: Transition['mode'], distanceM: number): Transition => ({
  distanceM,
  durationMin: 10,
  mode,
  estimated: true,
});

describe('mainTransportOf (D-048)', () => {
  it('is the mode that covers the most distance, not the most trips', () => {
    expect(mainTransportOf([trip('walk', 400), trip('walk', 500), trip('metro', 4000), null])).toBe(
      'metro',
    );
    expect(mainTransportOf([trip('bike', 900), trip('walk', 800), null])).toBe('bike');
  });

  it('is on foot without any trip', () => {
    expect(mainTransportOf([null])).toBe('walk');
    expect(mainTransportOf([])).toBe('walk');
  });
});
