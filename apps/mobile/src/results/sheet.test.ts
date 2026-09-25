import { describe, expect, it } from 'vitest';
import { sheetSnapPoints } from './sheet';

describe('sheetSnapPoints', () => {
  it('rests at 120 points, stops half at 296 from the top, full under the status bar', () => {
    expect(sheetSnapPoints({ containerHeight: 760, topInset: 54, peekHeight: 90 })).toEqual([
      120, 464, 706,
    ]);
  });

  it('raises the rest detent to show its content whole', () => {
    expect(sheetSnapPoints({ containerHeight: 760, topInset: 54, peekHeight: 212.4 })[0]).toBe(213);
  });

  it('keeps every detent above the previous one, on a short screen or with a tall content', () => {
    const [rest, half, full] = sheetSnapPoints({
      containerHeight: 400,
      topInset: 20,
      peekHeight: 600,
    });
    expect(rest).toBeLessThan(half);
    expect(half).toBeLessThan(full);
    expect(full).toBe(380);
  });
});
