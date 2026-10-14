import { RouteDetail, type RouteDetailStep, type TimelineStep } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import fixtures from '../route/generated/route-sheets.json';
import { hasConflicts, localTimeline, planNotice, slotTimeAt, stepMark } from './notice';

// « Le Marais à l'abri de la pluie » of the demo: three museums closed on Mondays, 10:00–18:00.
const route = RouteDetail.parse(fixtures.routes[0]);
const steps = route.steps as RouteDetailStep[];
const first = steps[0] as RouteDetailStep;
const now = new Date('2026-09-25T06:00:00Z');
const tuesday = '2026-09-29';
const monday = '2026-09-28';

const noticeAt = (day: string, minute: number, of = steps) =>
  planNotice(of, localTimeline(of, day, minute), day, minute, now);

describe('planNotice', () => {
  it('says the end when every place is open', () => {
    const notice = noticeAt(tuesday, 14 * 60);
    expect(notice).toMatchObject({ kind: 'open', hours: 'allOpen' });
    // From 15:30, the Cognacq-Jay closes at 18:00 during the visit: marked, not an alert.
    expect(noticeAt(tuesday, 15 * 60 + 30)).toMatchObject({ kind: 'open', hours: 'closesDuring' });
  });

  it('offers the next day when a place is closed that day', () => {
    expect(noticeAt(monday, 10 * 60)).toEqual({
      kind: 'closedThatDay',
      place: 'Maison de Victor Hugo',
      day: monday,
      nextDay: tuesday,
    });
  });

  it('offers the nearest start, earlier first, when a place is closed at the arrival', () => {
    const notice = noticeAt(tuesday, 17 * 60);
    expect(notice).toMatchObject({
      kind: 'closedAtArrival',
      place: 'Musée Cognacq-Jay',
      hours: { relation: 'closes', time: '18:00' },
    });
    const suggestion = notice.kind === 'closedAtArrival' ? notice.suggestion : null;
    expect(suggestion).not.toBeNull();
    expect(suggestion as number).toBeLessThan(17 * 60);
    expect(noticeAt(tuesday, suggestion as number).kind).toBe('open');
  });

  it('gives the last day possible when a step ends before the day (D-052)', () => {
    const ending = steps.map((step, index) =>
      index === 1 ? { ...step, endsOn: '2026-10-19' } : step,
    );
    // Monday 19, its last day, the museums are closed: the last day possible is Sunday 18.
    expect(noticeAt('2026-10-24', 10 * 60, ending)).toEqual({
      kind: 'ended',
      place: 'Musée Carnavalet',
      endsOn: '2026-10-19',
      lastDay: '2026-10-18',
    });
  });
});

describe('stepMark', () => {
  it('marks a step closed at the arrival with its closing time', () => {
    const timeline = localTimeline(steps, tuesday, 17 * 60);
    const index = timeline.steps.findIndex((entry) =>
      entry.conflicts.includes('closed_at_arrival'),
    );
    expect(
      stepMark(steps[index] as RouteDetailStep, timeline.steps[index] as TimelineStep, tuesday),
    ).toEqual({
      kind: 'closes',
      time: '18:00',
    });
    expect(hasConflicts(planNotice(steps, timeline, tuesday, 17 * 60, now), timeline)).toBe(true);
  });

  it('marks a place without hours, and nothing on an open one', () => {
    const timeline = localTimeline(steps, tuesday, 14 * 60);
    const unknown = { ...(steps[0] as RouteDetailStep), place: { ...first.place, hours: [] } };
    const entry = { ...(timeline.steps[0] as TimelineStep), conflicts: ['hours_unknown' as const] };
    expect(stepMark(unknown, entry, tuesday)).toEqual({ kind: 'hoursUnknown' });
    expect(
      stepMark(steps[0] as RouteDetailStep, timeline.steps[0] as TimelineStep, tuesday),
    ).toBeNull();
  });
});

describe('slotTimeAt', () => {
  it('tells the opening of a place reached before it opens', () => {
    expect(slotTimeAt(first.place.hours, tuesday, 9 * 60)).toEqual({
      relation: 'opens',
      time: '10:00',
    });
  });
});
