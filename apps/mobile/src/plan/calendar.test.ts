import { describe, expect, it } from 'vitest';
import {
  addDays,
  clockOf,
  daysBetween,
  earliestMinuteOf,
  monthWeeks,
  planDayOf,
  planMinuteOf,
  planStartOf,
  roundToStep,
  weekdayOf,
} from './calendar';

describe('planStartOf', () => {
  it('gives the offset of Paris on the day, summer or winter', () => {
    expect(planStartOf('2026-09-26', 600)).toBe('2026-09-26T10:00:00+02:00');
    expect(planStartOf('2027-01-23', 600)).toBe('2027-01-23T10:00:00+01:00');
  });

  it('takes the offset after the change of time of the morning', () => {
    // Sunday 25 October 2026: 3:00 becomes 2:00, the day ends in winter time.
    expect(planStartOf('2026-10-25', 600)).toBe('2026-10-25T10:00:00+01:00');
    expect(Date.parse(planStartOf('2026-10-25', 600))).toBe(Date.parse('2026-10-25T09:00:00Z'));
  });
});

describe('days in Paris', () => {
  it('reads the day and the time of an instant in Paris', () => {
    // 23:30 UTC is already the next day in Paris.
    expect(planDayOf('2026-09-25T23:30:00Z')).toBe('2026-09-26');
    expect(planMinuteOf('2026-09-25T23:30:00Z')).toBe(90);
  });

  it('counts days and weekdays from Monday', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-09-27', '2026-09-26')).toBe(-1);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(weekdayOf('2026-09-26')).toBe(5);
    expect(weekdayOf('2026-09-28')).toBe(0);
  });
});

describe('times', () => {
  it('writes and rounds a time on the grid of 15 minutes', () => {
    expect(clockOf(605)).toBe('10:05');
    expect(roundToStep(608)).toBe(615);
    expect(roundToStep(24 * 60)).toBe(23 * 60 + 45);
  });

  it('starts today at the next quarter, any other day at midnight', () => {
    const now = new Date('2026-09-25T08:10:00Z'); // 10:10 in Paris
    expect(earliestMinuteOf('2026-09-25', now)).toBe(615);
    expect(earliestMinuteOf('2026-09-26', now)).toBe(0);
    expect(earliestMinuteOf('2026-09-25', new Date('2026-09-25T08:15:00Z'))).toBe(630);
  });
});

describe('monthWeeks', () => {
  it('lays October 2026 out from Monday, as the calendar of E-06', () => {
    const weeks = monthWeeks(2026, 10);
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.at(-1)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      null,
    ]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});
