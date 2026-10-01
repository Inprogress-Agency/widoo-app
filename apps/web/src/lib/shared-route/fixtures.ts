import type { SharedRouteResult } from './types';

/**
 * Demo routes, answered in development only while no API is configured (`WIDOO_API_URL`), to
 * review the states of E-21. Fictitious data, no photo.
 */
export const sharedRouteFixtures: Record<string, SharedRouteResult> = {
  'demo-public': {
    kind: 'public',
    route: {
      id: 'demo-public',
      title: 'Montmartre sans les touristes',
      coverUrl: null,
      mood: 'culture',
      district: '18e',
      neighborhood: 'Abbesses',
      durationMin: 420,
      budgetPerPersonEur: 38,
      distanceM: 6100,
      stepCount: 4,
      rating: { average: 4.9, count: 128 },
      author: { kind: 'widoo' },
      access: 'free',
    },
  },
  'demo-premium': {
    kind: 'public',
    route: {
      id: 'demo-premium',
      title: 'Montmartre sans les touristes',
      coverUrl: null,
      mood: 'culture',
      district: '18e',
      neighborhood: 'Abbesses',
      durationMin: 420,
      budgetPerPersonEur: 38,
      distanceM: 6100,
      stepCount: 4,
      rating: { average: 4.9, count: 128 },
      author: { kind: 'widoo' },
      access: 'premium',
    },
  },
  'demo-private': {
    kind: 'private',
    route: {
      id: 'demo-private',
      title: 'Canal Saint-Martin au fil de l’eau',
      coverUrl: null,
      mood: 'nature',
      district: '10e',
      neighborhood: 'République',
      durationMin: 180,
      budgetPerPersonEur: 25,
      distanceM: 3400,
      stepCount: 4,
      rating: null,
      author: { kind: 'member', firstName: 'Camille' },
      access: 'free',
    },
  },
  'demo-removed': { kind: 'removed', removedAt: '2026-09-20T09:00:00Z' },
};
