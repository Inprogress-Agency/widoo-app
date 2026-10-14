import type { CoherenceIssue, LatLng, PlaceHours } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { computeRoute, type RouteInput, type RoutePlace, type RouteStep } from './route';

// Saturday 24 October 2026, 08:00 in Paris (UTC+2). Fictitious places and route.
const paris = 'Europe/Paris';
const saturdayMorning = new Date('2026-10-24T06:00:00.000Z');
const saturday = 5;
const slot = (opens: string, closes: string): PlaceHours => ({
  weekday: saturday,
  opens,
  closes,
  validFrom: null,
  validTo: null,
});

/** A point `km` kilometers east of the first step, on a parallel of Paris. */
const east = (km: number): LatLng => ({ lat: 48.86, lng: 2.36 + km * 0.0136 });
const place = (km: number, fields: Partial<RoutePlace> = {}): RoutePlace => ({
  location: east(km),
  hours: [],
  alwaysOpen: true,
  isIndoor: false,
  verificationStatus: 'verified',
  verifiedAt: '2026-10-01T10:00:00.000Z',
  ...fields,
});
const walk = (durationMin: number) => ({
  distanceM: durationMin * 75,
  durationMin,
  mode: 'walk' as const,
});
const step = (id: string, km: number, fields: Partial<RouteStep> = {}): RouteStep => ({
  id,
  placeId: `place-${id}`,
  durationMin: 60,
  costPerPersonEur: 10,
  transition: walk(10),
  hasPhoto: true,
  bookingRequired: false,
  place: place(km),
  ...fields,
});

/** Three steps of an hour, 500 m and ten minutes apart on foot, open at any hour. */
const valid: RouteInput = {
  title: 'Le Marais gourmand',
  description: 'Une boucle tranquille entre cafés, fromagers et cours pavées du Marais. '.repeat(2),
  hasPhoto: true,
  suggestedStart: null,
  timeZone: paris,
  steps: [step('a', 0), step('b', 0.5), step('c', 1, { transition: null, costPerPersonEur: null })],
};
/** The valid route, its second step in a place of these fields. */
const withSecondPlace = (fields: Partial<RoutePlace> | null, route: Partial<RouteInput> = {}) => ({
  ...valid,
  ...route,
  steps: valid.steps.map((entry, index) =>
    index === 1 ? { ...entry, place: fields && place(0.5, fields) } : entry,
  ),
});
const codes = (issues: CoherenceIssue[]) => issues.map((issue) => [issue.code, issue.stepPosition]);

describe('computeRoute', () => {
  it('derives the buckets, filters, transport and start, and breaks no rule', () => {
    const result = computeRoute(valid, { now: saturdayMorning });
    expect(result).toMatchObject({
      computed: {
        durationMin: 200,
        budgetPerPersonEur: 20,
        distanceM: 1500,
        walkingM: 1500,
        effort: 'easy',
        computedAt: '2026-10-24T06:00:00.000Z',
        durationBucket: 'half_day',
        budgetBucket: 'low',
        conditions: ['no_booking', 'outdoor'],
        transport: 'walk',
        startTime: '14:00',
        startComputed: true,
      },
      warnings: [],
      errors: [],
    });
    expect(result.timeline).toMatchObject({
      startsAt: '2026-10-24T12:00:00.000Z',
      endsAt: '2026-10-24T15:20:00.000Z',
    });
  });

  it('keeps the start the creator chose', () => {
    const result = computeRoute({ ...valid, suggestedStart: '09:30' }, { now: saturdayMorning });
    expect(result.computed).toMatchObject({ startTime: '09:30', startComputed: false });
    expect(result.timeline?.startsAt).toBe('2026-10-24T07:30:00.000Z');
  });

  it('computes a start where every place is open at arrival (D-050)', () => {
    // At 14:00 the second step is reached at 15:10, before it opens at 16:00.
    const result = computeRoute(
      withSecondPlace({ alwaysOpen: false, hours: [slot('16:00', '20:00')] }),
      {
        now: saturdayMorning,
      },
    );
    expect(result.computed?.startTime).toBe('15:00');
    expect(result.warnings).toEqual([]);
    expect(result.timeline?.steps[1]).toMatchObject({
      arrivesAt: '2026-10-24T14:10:00.000Z',
      conflicts: [],
    });
  });

  it('only notes hours_unknown in the timeline, a place of unknown hours breaking no rule', () => {
    const result = computeRoute(withSecondPlace({ alwaysOpen: false }), { now: saturdayMorning });
    expect(result.timeline?.steps[1]?.conflicts).toEqual(['hours_unknown']);
    expect(result.warnings).toEqual([]);
  });

  it('blocks step_has_place for a step without a geolocated place', () => {
    const result = computeRoute(withSecondPlace(null), { now: saturdayMorning });
    expect(codes(result.errors)).toEqual([['step_has_place', 1]]);
  });

  it.each([
    ['never verified', { verifiedAt: null }, true],
    ['flagged by visitors', { verificationStatus: 'flagged' as const }, true],
    ['closed', { verificationStatus: 'closed' as const }, true],
    ['verified long ago', { verificationStatus: 'stale' as const }, false],
  ])('warns unverified_place for a place %s: %s', (_, fields, warns) => {
    const result = computeRoute(withSecondPlace(fields), { now: saturdayMorning });
    expect(codes(result.warnings)).toEqual(warns ? [['unverified_place', 1]] : []);
  });

  it('reads the buckets given, and starts a full day at 10:00', () => {
    const buckets = {
      budgetEur: { free: 0, low: 15, medium: 70 },
      durationMin: { '1_2h': 100, half_day: 150, full_day: 720 },
    };
    const result = computeRoute(valid, { now: saturdayMorning, buckets });
    expect(result.computed).toMatchObject({
      durationBucket: 'full_day',
      budgetBucket: 'medium',
      startTime: '10:00',
    });
  });

  it('derives the filters and the transport from the steps', () => {
    const indoor = { isIndoor: true };
    const result = computeRoute(
      {
        ...valid,
        steps: [
          step('a', 0, { place: place(0, indoor), bookingRequired: true }),
          step('b', 0.5, {
            place: place(0.5, indoor),
            transition: { distanceM: 4000, durationMin: 20, mode: 'metro' },
          }),
          step('c', 1, { transition: null }),
        ],
      },
      { now: saturdayMorning },
    );
    expect(result.computed).toMatchObject({ conditions: ['indoor'], transport: 'metro' });
  });

  it('has neither aggregates nor timeline without any step', () => {
    const result = computeRoute({ ...valid, steps: [] }, { now: saturdayMorning });
    expect(result).toMatchObject({ computed: null, timeline: null });
    expect(codes(result.errors)).toContainEqual(['min_steps', null]);
  });
});
