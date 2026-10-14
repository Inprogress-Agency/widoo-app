import type { PublicProfile, RouteCard } from '@widoo/shared';

const camilleId = '0b6f6a2e-3c1d-4d8e-9a65-1f2b3c4d5e6f';

/** A fictitious route card of Camille, free and without review. */
export function testCard(id: string, title: string, overrides: Partial<RouteCard> = {}): RouteCard {
  return {
    id,
    title,
    coverUrl: null,
    isOfficial: false,
    author: { id: camilleId, firstName: 'Camille', avatarUrl: null },
    access: 'free',
    isVerified: false,
    moods: ['nature'],
    audiences: [],
    conditions: [],
    transport: 'walk',
    district: '10e',
    neighborhood: 'République',
    durationMin: 180,
    durationBucket: 'half_day',
    budgetPerPersonEur: 25,
    budgetBucket: 'low',
    distanceM: 4200,
    rating: { average: null, count: 0 },
    isLocked: false,
    stepCount: 1,
    steps: [
      { category: 'walk', location: { lat: 48.8674, lng: 2.3636 }, name: null, durationMin: null },
    ],
    ...overrides,
  };
}

const canal = testCard(
  '6a1d3c2b-0e4f-4a5b-8c7d-9e0f1a2b3c4d',
  'Canal Saint-Martin au fil de l’eau',
);

/** The public profile of Camille (Ecrans › E-16, planche 1): certified, 8 routes published. */
export function testPublicProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: camilleId,
    firstName: 'Camille',
    avatarUrl: null,
    createdAt: '2026-03-14T10:00:00.000Z',
    neighborhood: 'Paris 11e',
    bio: 'Parisienne de l’Est. Je cherche les coins calmes au bord de l’eau.',
    certified: true,
    certification: {
      criteria: [
        { criterion: 'verifiedRoutes', value: 8, threshold: 3, isMet: true },
        { criterion: 'averageRating', value: 4.8, threshold: 4.5, isMet: true },
        { criterion: 'completedRoutes', value: 23, threshold: 3, isMet: true },
      ],
    },
    routesPublished: 8,
    routesCompleted: 23,
    ratingAvg: 4.8,
    verifiedPlaces: 12,
    anecdotes: [
      {
        questionKey: 'stroll_neighborhood',
        questionLabel: 'Mon quartier pour flâner',
        answer: 'Le haut de Belleville, pour la vue sur tout Paris.',
      },
    ],
    featuredRoutes: [canal],
    routes: { items: [canal], nextCursor: null },
    moodCounts: { nature: 5, food: 3 },
    ...overrides,
  };
}

/** The minimal profile of E-16: initial, first name, seniority, one route published. */
export function testMinimalProfile(): PublicProfile {
  return testPublicProfile({
    neighborhood: null,
    bio: null,
    certified: false,
    certification: { criteria: [] },
    routesPublished: 1,
    routesCompleted: null,
    ratingAvg: null,
    verifiedPlaces: null,
    anecdotes: [],
    featuredRoutes: [],
    moodCounts: { nature: 1 },
  });
}
