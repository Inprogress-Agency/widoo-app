import type { Me } from '@widoo/shared';

/** A fictitious account (Camille, Paris 11e), certified, for the tests of the profile. */
export function testMe(overrides: Partial<Me> = {}): Me {
  return {
    id: '0b6f6a2e-3c1d-4d8e-9a65-1f2b3c4d5e6f',
    email: 'camille@exemple.fr',
    firstName: 'Camille',
    avatarUrl: null,
    role: 'user',
    plan: 'free',
    planExpiresAt: null,
    isPublic: true,
    notificationPrefs: { plannedRouteReminders: true, creatorPush: true, creatorEmail: true },
    bio: 'Parisienne de l’Est. Je cherche les coins calmes au bord de l’eau.',
    neighborhood: 'Paris 11e',
    anecdotes: [
      {
        questionKey: 'stroll_neighborhood',
        questionLabel: 'Mon quartier pour flâner',
        answer: 'Le haut de Belleville, pour la vue sur tout Paris.',
      },
      {
        questionKey: 'ideal_sunday',
        questionLabel: 'Ma sortie idéale un dimanche',
        answer: 'Marché le matin, pique-nique au bord de l’eau.',
      },
    ],
    featuredRoutes: [
      { id: '6a1d3c2b-0e4f-4a5b-8c7d-9e0f1a2b3c4d', title: 'Canal Saint-Martin au fil de l’eau' },
      { id: '7b2e4d3c-1f5a-4b6c-9d8e-0f1a2b3c4d5e', title: 'Galeries et passages secrets du 2e' },
    ],
    certification: {
      isCertified: true,
      certifiedAt: '2026-06-01T08:00:00.000Z',
      criteria: [
        { criterion: 'verifiedRoutes', value: 4, threshold: 3, isMet: true },
        { criterion: 'averageRating', value: 4.8, threshold: 4.5, isMet: true },
        { criterion: 'completedRoutes', value: 23, threshold: 3, isMet: true },
      ],
    },
    createdAt: '2026-03-14T10:00:00.000Z',
    ...overrides,
  };
}
