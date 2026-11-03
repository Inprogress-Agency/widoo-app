import { describe, expect, it } from 'vitest';
import { taxonomies } from '../taxonomies';
import { PlaceSignalBody, StepPlaceSignal } from './place-signal';

const plannedRouteId = '0198c1de-0000-7000-8000-000000000001';

describe('PlaceSignalBody and StepPlaceSignal', () => {
  it('take a confirmation alone, and a report with its reason', () => {
    expect(PlaceSignalBody.safeParse({ kind: 'confirm', plannedRouteId }).success).toBe(true);
    for (const reason of taxonomies.signalReasons.filter((key) => key !== 'other')) {
      expect(StepPlaceSignal.safeParse({ kind: 'report', reason }).success).toBe(true);
    }
    expect(StepPlaceSignal.safeParse({ kind: 'report' }).success).toBe(false);
    expect(StepPlaceSignal.safeParse({ kind: 'confirm', reason: 'works' }).success).toBe(false);
  });

  it('ask a text of 80 characters for « other », and refuse one elsewhere', () => {
    const other = { kind: 'report', reason: 'other' };
    expect(StepPlaceSignal.safeParse(other).success).toBe(false);
    expect(StepPlaceSignal.safeParse({ ...other, comment: 'x'.repeat(80) }).success).toBe(true);
    expect(StepPlaceSignal.safeParse({ ...other, comment: 'x'.repeat(81) }).success).toBe(false);
    expect(StepPlaceSignal.safeParse({ ...other, comment: '<b>x</b>' }).success).toBe(false);
    expect(
      StepPlaceSignal.safeParse({ kind: 'report', reason: 'works', comment: 'Échafaudage' })
        .success,
    ).toBe(false);
  });

  it('need the outing for a place, none for a step, and refuse an unknown key', () => {
    expect(PlaceSignalBody.safeParse({ kind: 'confirm' }).success).toBe(false);
    expect(StepPlaceSignal.safeParse({ kind: 'confirm', plannedRouteId }).success).toBe(false);
    expect(PlaceSignalBody.safeParse({ kind: 'confirm', plannedRouteId, weight: 10 }).success).toBe(
      false,
    );
  });
});
