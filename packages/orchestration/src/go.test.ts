import type { PlaceHours, RouteTimeline } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { goTimeline, stepAlertOf, type GoTimelineStep } from './go';
import { openUntil } from './timeline';

// Saturday 24 October 2026 in Paris, UTC+2: 10:00 local is 08:00Z. Fictitious places.
const paris = 'Europe/Paris';
const saturday = 5;
const slot = (opens: string, closes: string): PlaceHours => ({
  weekday: saturday,
  opens,
  closes,
  validFrom: null,
  validTo: null,
});
const at = (time: string) => new Date(`2026-10-24T${time}:00.000Z`);
const iso = (time: string) => at(time).toISOString();

/** Three steps of 45 min, 15 min apart on foot, about 1 km from one another. */
function stepsOf(changes: Record<number, Partial<GoTimelineStep>> = {}): GoTimelineStep[] {
  return [0, 1, 2].map((index) => ({
    id: `step-${index}`,
    durationMin: 45,
    location: { lat: 48.8674 + index * 0.006, lng: 2.3636 },
    transition: index < 2 ? { durationMin: 15, mode: 'walk' } : null,
    hours: [],
    arrivedAt: null,
    doneAt: null,
    skippedAt: null,
    ...changes[index],
  }));
}

/** The timeline planned at 08:00Z: 08:00–08:45, 09:00–09:45, 10:00–10:45. */
const planned: RouteTimeline = {
  startsAt: iso('08:00'),
  endsAt: iso('10:45'),
  steps: ['08:00', '09:00', '10:00'].map((time, index) => ({
    stepId: `step-${index}`,
    arrivesAt: iso(time),
    leavesAt: new Date(at(time).getTime() + 45 * 60_000).toISOString(),
    conflicts: ['hours_unknown'],
  })),
};

const times = (timeline: RouteTimeline) =>
  timeline.steps.map((entry) => [
    entry.stepId,
    entry.arrivesAt.slice(11, 16),
    entry.leavesAt.slice(11, 16),
  ]);

describe('goTimeline', () => {
  it('keeps the planned times while on time', () => {
    const timeline = goTimeline(stepsOf(), planned, at('07:55'), paris);
    expect(times(timeline)).toEqual([
      ['step-0', '08:00', '08:45'],
      ['step-1', '09:00', '09:45'],
      ['step-2', '10:00', '10:45'],
    ]);
    expect(timeline.endsAt).toBe(iso('10:45'));
  });

  it('pushes the steps ahead from the real end of a step done, its own times kept', () => {
    const steps = stepsOf({ 0: { arrivedAt: at('08:05'), doneAt: at('09:10') } });
    const timeline = goTimeline(steps, planned, at('09:12'), paris);
    expect(times(timeline)).toEqual([
      ['step-0', '08:00', '08:45'],
      ['step-1', '09:25', '10:10'],
      ['step-2', '10:25', '11:10'],
    ]);
    expect(timeline.endsAt).toBe(iso('11:10'));
  });

  it('never reaches the step of the moment before now, nor leaves it before now once there', () => {
    const late = goTimeline(stepsOf(), planned, at('08:30'), paris);
    expect(times(late)[0]).toEqual(['step-0', '08:30', '09:15']);
    const stayed = goTimeline(
      stepsOf({ 0: { arrivedAt: at('08:00') } }),
      planned,
      at('09:00'),
      paris,
    );
    expect(times(stayed)[0]).toEqual(['step-0', '08:00', '09:00']);
    expect(stayed.endsAt).toBe(iso('11:00'));
  });

  it('goes straight across a skipped step, which has no time', () => {
    const steps = stepsOf({ 0: { doneAt: at('08:45') }, 1: { skippedAt: at('08:46') } });
    const timeline = goTimeline(steps, planned, at('08:46'), paris);
    expect(timeline.steps.map((entry) => entry.stepId)).toEqual(['step-0', 'step-2']);
    expect(timeline.directTrips).toEqual([
      {
        fromStepId: 'step-0',
        transition: expect.objectContaining({ mode: 'walk', estimated: true }) as unknown,
      },
    ]);
    const tripMin = timeline.directTrips[0]?.transition.durationMin ?? 0;
    // About 1.3 km on foot at 4.5 km/h: the direct trip, not the two planned ones.
    expect(tripMin).toBeGreaterThan(15);
    expect(timeline.steps[1]?.arrivesAt).toBe(
      new Date(at('08:45').getTime() + tripMin * 60_000).toISOString(),
    );
  });

  it('reads the conflicts of the steps ahead at their new times', () => {
    const steps = stepsOf({ 1: { hours: [slot('09:00', '12:00')] } });
    // 11:00 and 12:00 Paris are 09:00Z and 10:00Z: the museum closes at 10:00Z.
    const timeline = goTimeline(steps, planned, at('09:30'), paris);
    expect(timeline.steps[1]?.conflicts).toEqual(['closed_at_arrival']);
  });
});

describe('openUntil', () => {
  const hours = [slot('10:00', '12:00'), slot('14:00', '18:00')];

  it('tells when the opening of the moment ends, in the city', () => {
    expect(openUntil(hours, at('09:30'), paris)?.toISOString()).toBe(iso('10:00'));
    expect(openUntil(hours, at('13:10'), paris)?.toISOString()).toBe(iso('16:00'));
  });

  it('is null while closed, or without hours', () => {
    expect(openUntil(hours, at('10:30'), paris)).toBeNull();
    expect(openUntil([], at('09:30'), paris)).toBeNull();
  });
});

describe('stepAlertOf', () => {
  // Café Lomi closes at 16:00 in Paris (14:00Z) and is planned for 45 min.
  const cafe = { durationMin: 45, hours: [slot('08:00', '16:00')] };

  it('warns when less than half of the planned time is left before closing', () => {
    expect(stepAlertOf(cafe, { arrivesAt: iso('13:50') }, paris)).toEqual({
      kind: 'closing',
      arrivesAt: iso('13:50'),
      closesAt: iso('14:00'),
      remainingMin: 10,
    });
  });

  it('says nothing with half of the time left or more', () => {
    expect(stepAlertOf(cafe, { arrivesAt: iso('13:37') }, paris)).toBeNull();
    expect(stepAlertOf(cafe, { arrivesAt: iso('13:38') }, paris)?.kind).toBe('closing');
  });

  it('warns when the step will be closed on arrival', () => {
    expect(stepAlertOf(cafe, { arrivesAt: iso('14:10') }, paris)).toEqual({
      kind: 'closed',
      arrivesAt: iso('14:10'),
    });
  });

  it('never warns for a place open at any hour, or whose hours are unknown', () => {
    expect(
      stepAlertOf({ ...cafe, alwaysOpen: true }, { arrivesAt: iso('14:10') }, paris),
    ).toBeNull();
    expect(
      stepAlertOf({ durationMin: 45, hours: [] }, { arrivesAt: iso('14:10') }, paris),
    ).toBeNull();
  });
});
