import { describe, expect, it } from 'vitest';
import { ApiError, RouteDetail, RouteRemovedDetails, RouteTimeline, SheetStep } from '.';

// Fictitious data only.
const ids: [string, string, string] = [
  '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e10',
  '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e11',
  '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e12',
];
const location = { lat: 48.86, lng: 2.35 };
const place = {
  id: ids[0],
  name: 'Lieu fictif',
  category: 'museum',
  location,
  address: '1 rue Fictive, Paris',
  isIndoor: true,
  photoUrl: null,
  verificationStatus: 'verified',
  verifiedAt: null,
  hours: [],
};
const transition = { distanceM: 600, durationMin: 8, mode: 'walk', estimated: true };
const fullStep = (id: string, position: number) => ({
  id,
  position,
  isLocked: false,
  title: null,
  description: 'Conseil fictif',
  durationMin: 45,
  costPerPersonEur: 12,
  bookingRequired: false,
  bookingUrl: null,
  bookingProvider: null,
  bookingNote: null,
  bookingIsAffiliate: false,
  endsOn: null,
  transitionNote: null,
  transition,
  place,
  verification: { confirmations: 12, lastConfirmedAt: '2026-09-20T10:00:00.000Z', reports: null },
});
const lockedStep = (id: string, position: number) => ({
  id,
  position,
  isLocked: true,
  category: 'cafe',
  durationMin: 30,
  transition,
});
const timeline = {
  startsAt: '2026-10-13T08:00:00.000Z',
  endsAt: '2026-10-13T11:00:00.000Z',
  steps: ids.map((stepId) => ({
    stepId,
    arrivesAt: '2026-10-13T08:00:00.000Z',
    leavesAt: '2026-10-13T08:45:00.000Z',
    conflicts: [],
  })),
};
const detail = {
  id: ids[0],
  title: 'Parcours fictif',
  coverUrl: null,
  isOfficial: true,
  author: null,
  access: 'free',
  isVerified: true,
  moods: ['culture'],
  audiences: ['couple'],
  conditions: ['indoor'],
  transport: 'walk',
  district: '3e',
  neighborhood: 'Le Marais',
  durationMin: 180,
  durationBucket: 'half_day',
  budgetPerPersonEur: 36,
  budgetBucket: 'medium',
  distanceM: 2400,
  rating: { average: null, count: 0 },
  stepCount: 3,
  isLocked: false,
  status: 'published',
  description: 'Description fictive',
  photoUrls: [],
  walkingDistanceM: 2400,
  effort: 'easy',
  startAccess: null,
  creator: { routesPublished: 4, isCertified: false },
  sharedBy: null,
  reviews: [],
  timeline,
  steps: ids.map(fullStep),
};
const locked = {
  ...detail,
  access: 'premium',
  isLocked: true,
  steps: [fullStep(ids[0], 0), lockedStep(ids[1], 1), lockedStep(ids[2], 2)],
};

const review = {
  id: ids[0],
  firstName: 'Prénom',
  rating: 5,
  comment: null,
  createdAt: '2026-09-21T10:00:00.000Z',
};

describe('RouteDetail', () => {
  it('reads a sheet with every step in full and its timeline', () => {
    expect(RouteDetail.parse(detail).steps).toHaveLength(3);
  });

  it('reads a locked Premium sheet: the start in full, the others locked (D-014)', () => {
    const parsed = RouteDetail.parse(locked);
    expect(parsed.steps.map((step) => step.isLocked)).toEqual([false, true, true]);
  });

  it('refuses a locked step carrying a place, a name or an advice', () => {
    const leaking = { ...lockedStep(ids[1], 1), place };
    expect(SheetStep.safeParse(leaking).success).toBe(false);
    expect(SheetStep.safeParse({ ...lockedStep(ids[1], 1), description: 'x' }).success).toBe(false);
  });

  it.each([
    ['a locked free route', { ...locked, access: 'free' }],
    ['a locked route that locks its start', { ...locked, steps: ids.map(lockedStep) }],
    ['an unlocked route with a locked step', { ...locked, isLocked: false }],
    ['a sheet missing a step', { ...detail, steps: detail.steps.slice(0, 2) }],
    [
      'a timeline out of step order',
      { ...detail, timeline: { ...timeline, steps: [...timeline.steps].reverse() } },
    ],
    [
      'more than three reviews',
      {
        ...detail,
        reviews: Array(4)
          .fill(null)
          .map(() => review),
      },
    ],
    ['an unknown effort', { ...detail, effort: 'hard' }],
  ])('refuses %s', (_, value) => {
    expect(RouteDetail.safeParse(value).success).toBe(false);
  });

  it('reads who shared a private route, and the reports of a place', () => {
    const reported = {
      ...fullStep(ids[1], 1),
      verification: {
        confirmations: 0,
        lastConfirmedAt: null,
        reports: { count: 3, lastAt: '2026-09-22T10:00:00.000Z' },
      },
    };
    const parsed = RouteDetail.parse({
      ...detail,
      status: 'private',
      sharedBy: { firstName: 'Prénom' },
      steps: [detail.steps[0], reported, detail.steps[2]],
    });
    expect(parsed.sharedBy).toEqual({ firstName: 'Prénom' });
    expect(parsed.steps[1]).toMatchObject({ verification: { reports: { count: 3 } } });
  });
});

describe('RouteTimeline', () => {
  it('reads the conflicts of a step with its hours', () => {
    const steps = [{ ...timeline.steps[0], conflicts: ['closed_at_arrival'] }];
    expect(RouteTimeline.parse({ ...timeline, steps }).steps[0]?.conflicts).toEqual([
      'closed_at_arrival',
    ]);
    const unknown = [{ ...timeline.steps[0], conflicts: ['crowded'] }];
    expect(RouteTimeline.safeParse({ ...timeline, steps: unknown }).success).toBe(false);
  });
});

describe('a withdrawn route', () => {
  it('answers route_removed with the date of the withdrawal', () => {
    const body = ApiError.parse({
      code: 'route_removed',
      message: 'Route removed',
      details: { removedAt: '2026-09-20T10:00:00.000Z' },
    });
    expect(RouteRemovedDetails.parse(body.details).removedAt).toBe('2026-09-20T10:00:00.000Z');
  });
});
