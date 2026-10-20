import { stepMapsUrl } from '@widoo/orchestration';
import { describe, expect, it } from 'vitest';
import {
  actualMinutes,
  distanceToCurrent,
  doneRatio,
  emptyGoLocal,
  goProgress,
  isArrivalSuggested,
} from './progress';
import { kept, plannedFixture, stepIds } from './testPlanned';

const at = '2026-10-24T08:30:00.000Z';

describe('goProgress', () => {
  it('starts en route to the first step, none done', () => {
    const progress = goProgress(plannedFixture(), emptyGoLocal);
    expect(progress.current?.index).toBe(0);
    expect(progress.phase).toBe('en_route');
    expect(progress.next?.index).toBe(1);
    expect(progress.steps.map((entry) => entry.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(doneRatio(progress)).toBe(0);
  });

  it("is on site after « J'y suis », kept on the phone", () => {
    const local = kept(['arrived', stepIds[0]]);
    expect(goProgress(plannedFixture(), local).phase).toBe('on_site');
  });

  it('takes the arrival the API knows', () => {
    const planned = plannedFixture({ 0: { arrivedAt: at } });
    expect(goProgress(planned, emptyGoLocal).phase).toBe('on_site');
  });

  it('moves to the next step once one is done, by the API or offline', () => {
    const planned = plannedFixture({ 0: { doneAt: at } });
    const offline = kept(['done', stepIds[1]]);
    const progress = goProgress(planned, offline);
    expect(progress.current?.index).toBe(2);
    expect(progress.next).toBeNull();
    expect(progress.steps[1]?.doneAt).toBe(at);
    expect(progress.doneCount).toBe(2);
    expect(doneRatio(progress)).toBeCloseTo(2 / 3);
  });

  it('goes past a skipped step, which does not count as done', () => {
    const progress = goProgress(plannedFixture({ 0: { skippedAt: at } }), emptyGoLocal);
    expect(progress.current?.index).toBe(1);
    expect(progress.skippedCount).toBe(1);
    expect(progress.doneCount).toBe(0);
  });

  it('applies the actions kept on the phone as the API would', () => {
    const skipped = goProgress(plannedFixture(), kept(['skip', stepIds[0]]));
    expect(skipped.steps[0]?.status).toBe('skipped');
    expect(skipped.current?.index).toBe(1);
    // « Annuler » kept offline brings back a step the API knows skipped.
    const back = goProgress(plannedFixture({ 0: { skippedAt: at } }), kept(['unskip', stepIds[0]]));
    expect(back.current?.index).toBe(0);
    // A step done cannot be skipped any more, and a skipped step done counts as done.
    const done = goProgress(plannedFixture({ 0: { doneAt: at } }), kept(['skip', stepIds[0]]));
    expect(done.steps[0]?.status).toBe('done');
    const late = goProgress(plannedFixture({ 0: { skippedAt: at } }), kept(['done', stepIds[0]]));
    expect(late.steps[0]?.status).toBe('done');
  });

  it('has no step left once all are done', () => {
    const planned = plannedFixture({ 0: { doneAt: at }, 1: { doneAt: at }, 2: { doneAt: at } });
    const progress = goProgress(planned, emptyGoLocal);
    expect(progress.current).toBeNull();
    expect(progress.phase).toBe('en_route');
    expect(doneRatio(progress)).toBe(1);
  });

  it('has no step left once all remaining are skipped, which do not count as done', () => {
    const planned = plannedFixture({
      0: { doneAt: at },
      1: { skippedAt: at },
      2: { skippedAt: at },
    });
    const progress = goProgress(planned, emptyGoLocal);
    expect(progress.current).toBeNull();
    expect(progress.steps.map((entry) => entry.status)).toEqual(['done', 'skipped', 'skipped']);
    expect(progress.doneCount).toBe(1);
    expect(progress.skippedCount).toBe(2);
    expect(doneRatio(progress)).toBeCloseTo(1 / 3);
  });
});

describe('the times of the Go', () => {
  const saturday = 5;
  /** The fixture with the café closing at `closes` in Paris on Saturdays. */
  function withCafeClosing(closes: string) {
    const planned = plannedFixture({ 0: { doneAt: '2026-10-24T08:45:00.000Z' } });
    const cafe = planned.route.steps[2];
    if (cafe) {
      cafe.place.hours = [
        { weekday: saturday, opens: '08:00', closes, validFrom: null, validTo: null },
      ];
    }
    return planned;
  }

  it('pushes « Fin vers » when the step of the moment is late', () => {
    const planned = plannedFixture({ 0: { doneAt: '2026-10-24T08:45:00.000Z' } });
    const onTime = goProgress(planned, emptyGoLocal, new Date('2026-10-24T08:50:00.000Z'));
    expect(onTime.timeline.endsAt).toBe('2026-10-24T10:39:00.000Z');
    const late = goProgress(planned, emptyGoLocal, new Date('2026-10-24T09:30:00.000Z'));
    expect(late.steps[1]?.times?.arrivesAt).toBe('2026-10-24T09:30:00.000Z');
    expect(late.timeline.endsAt).toBe('2026-10-24T11:12:00.000Z');
  });

  it('has no time for a skipped step, and a direct trip across it', () => {
    const progress = goProgress(
      plannedFixture({ 1: { skippedAt: at } }),
      emptyGoLocal,
      new Date('2026-10-24T07:00:00.000Z'),
    );
    expect(progress.steps[1]?.times).toBeNull();
    expect(progress.steps[1]?.transition).toBeNull();
    // From the park to the café, in the mode of the trip that left the park: by bike.
    expect(progress.steps[0]?.transition).toMatchObject({ mode: 'bike', estimated: true });
    const last = goProgress(plannedFixture({ 2: { skippedAt: at } }), emptyGoLocal);
    expect(last.steps[1]?.transition).toBeNull();
  });

  it('alerts en route on a step that will close before half of its time', () => {
    // Late: the café is reached at 13:00 in Paris (11:00Z), now; 45 min planned.
    const now = new Date('2026-10-24T11:00:00.000Z');
    const closing = goProgress(withCafeClosing('13:20'), kept(['done', stepIds[1]]), now);
    expect(closing.current?.index).toBe(2);
    expect(closing.alert).toMatchObject({ kind: 'closing', remainingMin: 20 });
    const closed = goProgress(withCafeClosing('12:30'), kept(['done', stepIds[1]]), now);
    expect(closed.alert?.kind).toBe('closed');
    const fine = goProgress(withCafeClosing('18:00'), kept(['done', stepIds[1]]), now);
    expect(fine.alert).toBeNull();
    const there = goProgress(
      withCafeClosing('13:20'),
      kept(['done', stepIds[1]], ['arrived', stepIds[2]]),
      now,
    );
    expect(there.alert).toBeNull();
  });
});

describe('arrival suggestion', () => {
  const progress = goProgress(plannedFixture(), emptyGoLocal);

  it('shows under 100 m of the step, en route', () => {
    const near = distanceToCurrent(progress, { lat: 48.8674, lng: 2.3642 });
    expect(near).toBeLessThan(100);
    expect(isArrivalSuggested(progress, near)).toBe(true);
  });

  it('hides farther, without a position, or on site', () => {
    const far = distanceToCurrent(progress, { lat: 48.87, lng: 2.37 });
    expect(isArrivalSuggested(progress, far)).toBe(false);
    expect(distanceToCurrent(progress, null)).toBeNull();
    expect(isArrivalSuggested(progress, null)).toBe(false);
    const onSite = goProgress(plannedFixture(), kept(['arrived', stepIds[0]]));
    expect(isArrivalSuggested(onSite, 10)).toBe(false);
  });
});

describe('actualMinutes', () => {
  it('counts whole minutes since the start, never below 0', () => {
    const planned = plannedFixture();
    expect(actualMinutes(planned, new Date('2026-10-24T09:20:20.000Z'))).toBe(80);
    expect(actualMinutes(planned, new Date('2026-10-24T07:00:00.000Z'))).toBe(0);
  });
});

describe('maps URL', () => {
  const planned = plannedFixture();

  it('writes offline the URL the API writes, in the mode of the trip to the step', () => {
    // « Itinéraire » offline builds the URL of `maps-url` with the same shared `stepMapsUrl`
    // (#510): on foot to the first step, then in the mode of the trip that leads to it.
    expect(stepMapsUrl(planned.route.steps, 0)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=48.8674%2C2.3636&travelmode=walking',
    );
    expect(stepMapsUrl(planned.route.steps, 1)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=48.8714%2C2.3676&travelmode=bicycling',
    );
    // The trip to the third step is by metro (its latitude, computed, is not a round literal).
    expect(stepMapsUrl(planned.route.steps, 2)).toContain('travelmode=transit');
    // One destination, no waypoints: never the whole route.
    expect(stepMapsUrl(planned.route.steps, 2)).not.toContain('waypoints');
  });
});
