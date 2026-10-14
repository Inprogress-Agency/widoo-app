import type { PlaceHours } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { compatibleStart, defaultStartOf, instantAt, opensEverywhere, timeOfMinute } from './start';
import { computeTimeline, type TimelineStepInput } from './timeline';

// Saturday 24 October 2026 in Paris, UTC+2 until the change of the 25th. Fictitious places.
const paris = 'Europe/Paris';
const saturday = 5;
const slot = (weekday: number, opens: string, closes: string): PlaceHours => ({
  weekday,
  opens,
  closes,
  validFrom: null,
  validTo: null,
});
/** A museum closed for lunch on Saturdays, 10:00–12:00 and 14:00–18:00, closed on Sundays. */
const museum = [slot(saturday, '10:00', '12:00'), slot(saturday, '14:00', '18:00')];
/** An hour in a café of unknown hours, ten minutes on foot, then the museum. */
const cafeThenMuseum: TimelineStepInput[] = [
  { id: 'cafe', durationMin: 60, transitionMin: 10, hours: [] },
  { id: 'museum', durationMin: 60, transitionMin: null, hours: museum },
];

describe('defaultStartOf', () => {
  it('starts a day at 10:00 and half a day or less at 14:00', () => {
    expect(defaultStartOf('full_day')).toBe('10:00');
    expect(defaultStartOf('weekend')).toBe('10:00');
    expect(defaultStartOf('half_day')).toBe('14:00');
    expect(defaultStartOf('1_2h')).toBe('14:00');
  });
});

describe('instantAt', () => {
  it('reads a local time of the city, across the change to winter time', () => {
    expect(instantAt('2026-10-24', '10:00', paris).toISOString()).toBe('2026-10-24T08:00:00.000Z');
    expect(instantAt('2026-10-25', '10:00', paris).toISOString()).toBe('2026-10-25T09:00:00.000Z');
    expect(instantAt('2026-07-01', '00:30', paris).toISOString()).toBe('2026-06-30T22:30:00.000Z');
  });

  it('formats minutes of the day back', () => {
    expect(timeOfMinute(9 * 60 + 5)).toBe('09:05');
  });
});

describe('opensEverywhere', () => {
  it('tells a start that reaches a closed place from one that does not', () => {
    expect(opensEverywhere(cafeThenMuseum, instantAt('2026-10-24', '09:00', paris), paris)).toBe(
      true,
    );
    expect(opensEverywhere(cafeThenMuseum, instantAt('2026-10-24', '11:30', paris), paris)).toBe(
      false,
    );
  });
});

describe('compatibleStart', () => {
  it('keeps the start asked for when every place is open', () => {
    expect(compatibleStart(cafeThenMuseum, '2026-10-24', '09:00', paris)).toBe('09:00');
  });

  it('moves to the closest quarter of an hour that reaches the museum before its lunch break', () => {
    // 11:30 reaches the museum at 12:40, during the break; 10:45 reaches it at 11:55.
    expect(compatibleStart(cafeThenMuseum, '2026-10-24', '11:30', paris)).toBe('10:45');
  });

  it('finds the reopening when it is closer', () => {
    // 12:30 reaches the museum at 13:40; 13:00, at 14:10, is closer than 10:45.
    expect(compatibleStart(cafeThenMuseum, '2026-10-24', '12:30', paris)).toBe('13:00');
  });

  it('finds none on the closing day of a place', () => {
    expect(compatibleStart(cafeThenMuseum, '2026-10-25', '10:00', paris)).toBeNull();
  });
});

describe('computeTimeline, a place open at any hour', () => {
  it('raises no conflict, not even hours_unknown (D-049)', () => {
    const timeline = computeTimeline(
      [{ id: 'square', durationMin: 30, transitionMin: null, hours: [], alwaysOpen: true }],
      instantAt('2026-10-24', '23:00', paris),
      paris,
    );
    expect(timeline.steps[0]?.conflicts).toEqual([]);
  });
});
