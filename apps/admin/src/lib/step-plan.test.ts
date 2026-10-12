import { describe, expect, it } from 'vitest';
import { layOutSteps, planSize } from './step-plan';

const paris = [
  { lat: 48.8846, lng: 2.3385 },
  { lat: 48.8867, lng: 2.3431 },
  { lat: 48.8822, lng: 2.3402 },
];

describe('layOutSteps', () => {
  it('keeps every step inside the plan, with a margin', () => {
    for (const { x, y } of layOutSteps(paris)) {
      expect(x).toBeGreaterThanOrEqual(28);
      expect(x).toBeLessThanOrEqual(planSize.width - 28);
      expect(y).toBeGreaterThanOrEqual(28);
      expect(y).toBeLessThanOrEqual(planSize.height - 28);
    }
  });

  it('puts the north at the top and the east on the right', () => {
    const [first, second, third] = layOutSteps(paris);
    expect(second?.y).toBeLessThan(third?.y ?? 0);
    expect(second?.x).toBeGreaterThan(first?.x ?? Infinity);
  });

  it('centers a route with a single place', () => {
    expect(layOutSteps([paris[0] ?? { lat: 0, lng: 0 }])).toEqual([
      { x: planSize.width / 2, y: planSize.height / 2 },
    ]);
  });

  it('gives nothing for a route without step', () => {
    expect(layOutSteps([])).toEqual([]);
  });
});
