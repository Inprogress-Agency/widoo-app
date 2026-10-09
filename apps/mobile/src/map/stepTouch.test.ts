import { describe, expect, it } from 'vitest';
import { nearestStep } from './stepTouch';

describe('nearestStep', () => {
  it('gives the step under the finger', () => {
    expect(nearestStep({ x: 105, y: 98 }, [{ x: 100, y: 100 }])).toBe(0);
  });

  it('gives the closest of two overlapping targets, never the one drawn on top', () => {
    const steps = [
      { x: 100, y: 100 },
      { x: 120, y: 100 },
    ];
    expect(nearestStep({ x: 104, y: 100 }, steps)).toBe(0);
    expect(nearestStep({ x: 116, y: 100 }, steps)).toBe(1);
  });

  it('keeps the touch target of 44 points around each dot', () => {
    expect(nearestStep({ x: 122, y: 78 }, [{ x: 100, y: 100 }])).toBe(0);
    expect(nearestStep({ x: 123, y: 100 }, [{ x: 100, y: 100 }])).toBeNull();
  });

  it('gives no step away from every dot', () => {
    expect(nearestStep({ x: 300, y: 300 }, [{ x: 100, y: 100 }])).toBeNull();
    expect(nearestStep({ x: 300, y: 300 }, [])).toBeNull();
  });
});
