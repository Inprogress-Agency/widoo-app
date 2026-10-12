import { describe, expect, it } from 'vitest';
import { formatDuration, formatFullDate, formatRelativeDate, formatWaitingTime } from './dates';

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

describe('formatWaitingTime', () => {
  it.each([
    [20 * minute, '20 min'],
    [9 * hour, '9 h'],
    [day + 22 * hour, '1 j 22 h'],
    [3 * day + 4 * hour + 10 * minute, '3 j 4 h'],
    [2 * day, '2 j'],
  ])('says %i ms of waiting as « %s »', (elapsed, expected) => {
    expect(formatWaitingTime(ago(elapsed), now)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it.each([
    [45, '45 min'],
    [420, '7 h'],
    [270, '4 h 30'],
    [185, '3 h 05'],
  ])('says %i minutes as « %s »', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
