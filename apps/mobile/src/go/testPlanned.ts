import type { PlannedRoute, PlannedStepProgress } from '@widoo/shared';

/** Fictitious ids of the three steps of `plannedFixture`. */
export const stepIds = [
  '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e31',
  '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e32',
  '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e33',
] as const;

const names = ['Place fictive', 'Musée fictif', 'Café fictif'] as const;
const categories = ['park', 'museum', 'cafe'] as const;
/** Arrival and departure of each step, in UTC. */
const times = [
  ['08:00', '08:45'],
  ['09:00', '10:45'],
  ['11:00', '11:45'],
] as const;

/**
 * A fictitious Go in progress of three steps near République, started at 10:00 in Paris; the
 * progress of a step overridden by its index.
 */
export function plannedFixture(
  progress: Record<number, Partial<Omit<PlannedStepProgress, 'stepId'>>> = {},
): PlannedRoute {
  const at = '2026-10-24T08:00:00.000Z';
  return {
    id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e30',
    routeId: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e29',
    status: 'in_progress',
    startsAt: at,
    completedAt: null,
    closedBy: null,
    route: {
      id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e29',
      title: 'Parcours fictif',
      access: 'free',
      isOfficial: false,
      timezone: 'Europe/Paris',
      steps: stepIds.map((id, index) => ({
        id,
        position: index,
        title: null,
        description: index === 1 ? 'Un mot fictif du créateur.' : null,
        durationMin: 45,
        costPerPersonEur: index === 1 ? 15 : null,
        bookingRequired: false,
        bookingUrl: null,
        bookingProvider: null,
        transitionNote: null,
        transition:
          index < stepIds.length - 1
            ? { distanceM: 900, durationMin: 12, mode: 'walk', estimated: true }
            : null,
        place: {
          id,
          name: names[index] ?? 'Lieu fictif',
          category: categories[index] ?? 'cafe',
          location: { lat: 48.8674 + index * 0.004, lng: 2.3636 + index * 0.004 },
          address: '1 rue Fictive, Paris',
          isIndoor: index === 1,
          hours: [],
        },
        highlights: [],
        photos: [],
      })),
    },
    timeline: {
      startsAt: at,
      endsAt: '2026-10-24T12:00:00.000Z',
      steps: stepIds.map((stepId, index) => ({
        stepId,
        arrivesAt: `2026-10-24T${times[index]?.[0] ?? '08:00'}:00.000Z`,
        leavesAt: `2026-10-24T${times[index]?.[1] ?? '08:45'}:00.000Z`,
        conflicts: [],
      })),
    },
    checklist: [],
    steps: stepIds.map((stepId, index) => ({
      stepId,
      arrivedAt: null,
      doneAt: null,
      skippedAt: null,
      ...progress[index],
    })),
    myRating: null,
    createdAt: at,
    updatedAt: at,
  };
}
