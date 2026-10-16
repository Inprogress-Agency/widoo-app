import type { OwnRouteSummary, PlannedRoute } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { plannedFixture } from '../go/testPlanned';
import { createdPillOf, opensSheet, pastActionOf, pastOutings, pastPillOf } from './lists';

const doneAt = '2026-10-24T09:00:00.000Z';
const outing = (overrides: Partial<PlannedRoute>, isDone = true): PlannedRoute => {
  const fixture = plannedFixture(isDone ? { 0: { doneAt }, 1: { doneAt }, 2: { doneAt } } : {});
  return { ...fixture, ...overrides };
};
const rating = {
  rating: 5,
  comment: null,
  createdAt: doneAt,
  updatedAt: doneAt,
};

describe('past outings', () => {
  it('keeps the outings done, stopped or not done, the latest first', () => {
    const items = [
      outing({ id: 'a', status: 'completed', startsAt: '2026-09-13T08:00:00.000Z' }),
      outing({ id: 'b', status: 'planned', startsAt: '2026-10-30T08:00:00.000Z' }),
      outing({ id: 'c', status: 'stopped', startsAt: '2026-09-19T08:00:00.000Z' }),
      outing({ id: 'd', status: 'cancelled', startsAt: '2026-09-20T08:00:00.000Z' }),
      outing({ id: 'e', status: 'missed', startsAt: '2026-09-05T08:00:00.000Z' }),
      outing({ id: 'f', status: 'in_progress' }),
    ];
    expect(pastOutings(items).map((item) => item.id)).toEqual(['c', 'a', 'e']);
  });
});

describe('the action of a past line', () => {
  it('asks for a rating of a finished outing not rated yet', () => {
    expect(pastActionOf(outing({ status: 'completed' }))).toBe('rate');
  });

  it('shows the rating instead once given', () => {
    expect(pastActionOf(outing({ status: 'completed', myRating: rating }))).toBeNull();
  });

  it('offers no rating under half of the steps done (E-15)', () => {
    expect(pastActionOf(outing({ status: 'completed' }, false))).toBeNull();
  });

  it('restarts a stopped route and reschedules one not done, with their pill', () => {
    const stopped = outing({ status: 'stopped' });
    const missed = outing({ status: 'missed' }, false);
    expect([pastActionOf(stopped), pastPillOf(stopped)]).toEqual(['relaunch', 'stopped']);
    expect([pastActionOf(missed), pastPillOf(missed)]).toEqual(['reschedule', 'missed']);
    expect(pastPillOf(outing({ status: 'completed' }))).toBeNull();
  });
});

describe('the pill of a creation', () => {
  const created = (status: OwnRouteSummary['status']): OwnRouteSummary => ({
    id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e40',
    status,
    isOfficial: false,
    title: 'Parcours fictif',
    shareToken: null,
    publishedAt: null,
    updatedAt: doneAt,
    revision: null,
    stepCount: 3,
  });

  it('names every status of the wiki, both corrections as « À corriger »', () => {
    expect(createdPillOf(created('changes_requested'))).toBe('toFix');
    expect(createdPillOf(created('needs_fix'))).toBe('toFix');
    expect(createdPillOf(created('rejected'))).toBe('rejected');
    expect(createdPillOf(created('unpublished'))).toBe('unpublished');
  });

  it('opens the sheet of a published or private route only', () => {
    expect(opensSheet(created('published'))).toBe(true);
    expect(opensSheet(created('private'))).toBe(true);
    expect(opensSheet(created('draft'))).toBe(false);
    expect(opensSheet(created('pending'))).toBe(false);
  });
});
