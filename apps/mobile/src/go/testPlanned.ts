import type { PlannedRoute, PlannedStepProgress } from '@widoo/shared';
import type { GoLocal, GoStepAction } from './progress';

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
 * « À ne pas manquer » and « En images » of the second step: a free photo with its credit, then
 * a creator's photo without any; the other steps have none.
 */
export const museumHighlights = ['La salle fictive', "L'atelier fictif"];
export const museumPhotos = [
  {
    url: 'https://example.com/photos/musee-fictif-1.jpg',
    credit: {
      author: 'J. Moreau',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Musee-fictif.jpg',
    },
  },
  { url: 'https://example.com/photos/musee-fictif-2.jpg', credit: null },
];
/** The trip of each step to the next one, in a mode of its own (#510); null for the last one. */
const trips = [
  { distanceM: 900, durationMin: 12, mode: 'bike', estimated: true },
  { distanceM: 900, durationMin: 12, mode: 'metro', estimated: true },
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
        transition: trips[index] ?? null,
        place: {
          id,
          name: names[index] ?? 'Lieu fictif',
          category: categories[index] ?? 'cafe',
          location: { lat: 48.8674 + index * 0.004, lng: 2.3636 + index * 0.004 },
          address: '1 rue Fictive, Paris',
          isIndoor: index === 1,
          alwaysOpen: false,
          hours: [],
        },
        highlights: index === 1 ? museumHighlights : [],
        photos: index === 1 ? museumPhotos : [],
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

/** What the phone keeps of the Go: these actions, not sent yet, taken at 10:30 in Paris. */
export const kept = (...actions: [GoStepAction, string][]): GoLocal => ({
  pending: actions.map(([action, stepId]) => ({ action, stepId, at: '2026-10-24T08:30:00.000Z' })),
});
