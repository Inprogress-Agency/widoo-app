import { describe, expect, it } from 'vitest';
import { earliestGiftDay, endOfGiftDay } from './gift-date';

describe('earliestGiftDay', () => {
  it('is tomorrow, also across a month', () => {
    expect(earliestGiftDay(new Date(2026, 9, 16, 10))).toBe('2026-10-17');
    expect(earliestGiftDay(new Date(2026, 9, 31, 23))).toBe('2026-11-01');
  });
});

describe('endOfGiftDay', () => {
  it('is the last second of the chosen day', () => {
    expect(new Date(endOfGiftDay('2026-12-01')).getTime()).toBe(
      new Date(2026, 11, 1, 23, 59, 59).getTime(),
    );
  });
});
