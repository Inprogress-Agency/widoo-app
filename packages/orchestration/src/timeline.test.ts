import type { PlaceHours } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { computeTimeline, conflictsOf } from './timeline';

// Saturday 24 October 2026 in Paris, UTC+2: 10:00 local is 08:00Z. Fictitious places.
const paris = 'Europe/Paris';
const saturday = 5;
const slot = (weekday: number, opens: string, closes: string, valid: Partial<PlaceHours> = {}) => ({
  weekday,
  opens,
  closes,
  validFrom: null,
  validTo: null,
  ...valid,
});
/** Open on Saturdays 10:00–12:00 and 14:00–18:00: the lunch break of the museum. */
const museum = [slot(saturday, '10:00', '12:00'), slot(saturday, '14:00', '18:00')];
const at = (iso: string) => new Date(iso);
const stay = (hours: PlaceHours[], from: string, minutes: number) =>
  conflictsOf(hours, at(from), new Date(at(from).getTime() + minutes * 60_000), paris);

describe('computeTimeline', () => {
  it('chains the stays and the trips from the start', () => {
    const timeline = computeTimeline(
      [
        { id: 'a', durationMin: 60, transitionMin: 12, hours: museum },
        { id: 'b', durationMin: 30, transitionMin: null, hours: [] },
      ],
      at('2026-10-24T08:00:00Z'),
      paris,
    );

    expect(timeline).toEqual({
      startsAt: '2026-10-24T08:00:00.000Z',
      endsAt: '2026-10-24T09:42:00.000Z',
      steps: [
        {
          stepId: 'a',
          arrivesAt: '2026-10-24T08:00:00.000Z',
          leavesAt: '2026-10-24T09:00:00.000Z',
          conflicts: [],
        },
        {
          stepId: 'b',
          arrivesAt: '2026-10-24T09:12:00.000Z',
          leavesAt: '2026-10-24T09:42:00.000Z',
          conflicts: ['hours_unknown'],
        },
      ],
    });
  });

  it('ends at the start without a step', () => {
    const timeline = computeTimeline([], at('2026-10-24T08:00:00Z'), paris);
    expect(timeline).toMatchObject({ endsAt: '2026-10-24T08:00:00.000Z', steps: [] });
  });
});

describe('conflictsOf', () => {
  it('reads the hours in the local time of the city', () => {
    expect(stay(museum, '2026-10-24T08:00:00Z', 60)).toEqual([]);
    expect(stay(museum, '2026-10-24T07:30:00Z', 30)).toEqual(['closed_at_arrival']);
  });

  it('finds the lunch break, and a step that runs into it', () => {
    expect(stay(museum, '2026-10-24T10:30:00Z', 30)).toEqual(['closed_at_arrival']);
    expect(stay(museum, '2026-10-24T09:30:00Z', 60)).toEqual(['closes_during_step']);
  });

  it('tells a day without a slot from a closed hour', () => {
    expect(stay(museum, '2026-10-25T08:00:00Z', 60)).toEqual(['closed_that_day']);
  });

  it('joins touching slots and follows a slot past midnight', () => {
    const continuous = [slot(saturday, '10:00', '12:00'), slot(saturday, '12:00', '14:00')];
    expect(stay(continuous, '2026-10-24T09:30:00Z', 60)).toEqual([]);
    const bar = [slot(saturday, '18:00', '02:00')];
    // Sunday 01:00 local, still the night of Saturday.
    expect(stay(bar, '2026-10-24T23:00:00Z', 30)).toEqual([]);
    expect(stay(bar, '2026-10-24T23:30:00Z', 60)).toEqual(['closes_during_step']);
  });

  it('keeps seasonal slots to their dates', () => {
    const summer = [
      slot(saturday, '10:00', '18:00', { validFrom: '2026-06-01', validTo: '2026-09-30' }),
    ];
    expect(stay(summer, '2026-10-24T08:00:00Z', 60)).toEqual(['closed_that_day']);
    expect(stay(summer, '2026-09-26T08:00:00Z', 60)).toEqual([]);
  });

  it('warns when the hours are unknown', () => {
    expect(stay([], '2026-10-24T08:00:00Z', 60)).toEqual(['hours_unknown']);
  });
});
