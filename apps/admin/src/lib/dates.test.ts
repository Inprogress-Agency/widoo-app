import { describe, expect, it } from 'vitest';
import { formatFullDate, formatRelativeDate } from './dates';

const now = new Date('2026-10-12T10:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

describe('formatRelativeDate', () => {
  it.each([
    [30_000, "à l'instant"],
    [12 * minute, 'il y a 12 min'],
    [6 * hour, 'il y a 6 h'],
    [30 * hour, 'hier'],
    [3 * day, 'il y a 3 j'],
    [6 * day + 23 * hour, 'il y a 6 j'],
  ])('says %i ms ago as « %s »', (elapsed, expected) => {
    expect(formatRelativeDate(ago(elapsed), now)).toBe(expected);
  });

  it('gives the date after 7 days', () => {
    expect(formatRelativeDate(ago(7 * day), now)).toBe('5 oct. 2026');
  });
});

describe('formatFullDate', () => {
  it('writes the day and the time of Paris', () => {
    // 06:12 UTC is 08:12 in Paris in October (UTC+2).
    expect(formatFullDate(new Date('2026-10-08T06:12:00Z'))).toBe('jeudi 8 octobre à 8:12');
  });
});
