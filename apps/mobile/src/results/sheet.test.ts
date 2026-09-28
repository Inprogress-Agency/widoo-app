import { describe, expect, it } from 'vitest';
import { sheetSnapPoints } from './sheet';

describe('sheetSnapPoints', () => {
  it('rests at 120 points, stops half at 296 from the top, full under the status bar', () => {
    expect(
      sheetSnapPoints({ containerHeight: 760, barHeight: 0, topInset: 54, peekHeight: 90 }),
    ).toEqual([120, 464, 706]);
  });

  it('raises the rest detent to show its content whole', () => {
    expect(
      sheetSnapPoints({ containerHeight: 760, barHeight: 0, topInset: 54, peekHeight: 212.4 })[0],
    ).toBe(213);
  });

  it('counts the rest detent above the floating tab bar, the others from the top', () => {
    expect(
      sheetSnapPoints({ containerHeight: 844, barHeight: 94, topInset: 54, peekHeight: 90 }),
    ).toEqual([214, 548, 790]);
  });

  it('keeps every detent above the previous one, on a short screen or with a tall content', () => {
    const [rest, half, full] = sheetSnapPoints({
      containerHeight: 400,
      barHeight: 0,
      topInset: 20,
      peekHeight: 600,
    });
    expect(rest).toBeLessThan(half);
    expect(half).toBeLessThan(full);
    expect(full).toBe(380);
  });

  it('keeps the detents in order when the tab bar takes most of a short screen', () => {
    const [rest, half, full] = sheetSnapPoints({
      containerHeight: 400,
      barHeight: 250,
      topInset: 20,
      peekHeight: 90,
    });
    expect(rest).toBeLessThan(half);
    expect(half).toBeLessThan(full);
    expect(rest).toBeGreaterThan(250);
  });
});
