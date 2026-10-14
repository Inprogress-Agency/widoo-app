import type { Certification, CertificationCriterion, Me } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { certificationGap, completionOf, memberSince } from './progress';

const criterion = (
  key: CertificationCriterion['criterion'],
  value: number | null,
  threshold: number,
): CertificationCriterion => ({
  criterion: key,
  value,
  threshold,
  isMet: value !== null && value >= threshold,
});

const certification = (criteria: CertificationCriterion[], isCertified = false): Certification => ({
  isCertified,
  certifiedAt: null,
  criteria,
});

describe('certification gap', () => {
  it('says how many verified routes are missing when only that criterion is', () => {
    const gap = certificationGap(
      certification([
        criterion('verifiedRoutes', 2, 3),
        criterion('averageRating', 4.6, 4.5),
        criterion('completedRoutes', 9, 3),
      ]),
    );
    expect(gap).toEqual({ kind: 'count', criterion: 'verifiedRoutes', count: 1 });
  });

  it('counts a criterion without any value from zero', () => {
    const gap = certificationGap(
      certification([
        criterion('verifiedRoutes', 3, 3),
        criterion('averageRating', 4.8, 4.5),
        criterion('completedRoutes', null, 3),
      ]),
    );
    expect(gap).toEqual({ kind: 'count', criterion: 'completedRoutes', count: 3 });
  });

  it('names the rating threshold, and counts several missing criteria', () => {
    expect(
      certificationGap(
        certification([
          criterion('verifiedRoutes', 3, 3),
          criterion('averageRating', null, 4.5),
          criterion('completedRoutes', 3, 3),
        ]),
      ),
    ).toEqual({ kind: 'rating', threshold: 4.5 });
    expect(
      certificationGap(
        certification([
          criterion('verifiedRoutes', 0, 3),
          criterion('averageRating', null, 4.5),
          criterion('completedRoutes', 1, 3),
        ]),
      ),
    ).toEqual({ kind: 'several', count: 3 });
  });

  it('says nothing once certified, even by the team without the criteria', () => {
    expect(certificationGap(certification([criterion('verifiedRoutes', 0, 3)], true))).toBeNull();
  });
});

describe('profile completion', () => {
  const me = { avatarUrl: null, bio: null, anecdotes: [] } as unknown as Me;

  it('lists the photo, the bio and an anecdote, the neighbourhood left out', () => {
    expect(completionOf(me)).toEqual([
      { step: 'photo', isDone: false },
      { step: 'bio', isDone: false },
      { step: 'anecdote', isDone: false },
    ]);
    const done = completionOf({
      ...me,
      bio: 'Parisienne de l’Est.',
      anecdotes: [{ questionKey: 'hidden_gem', questionLabel: 'Un bon plan', answer: 'Ici.' }],
    });
    expect(done.filter((step) => step.isDone).map((step) => step.step)).toEqual([
      'bio',
      'anecdote',
    ]);
  });
});

describe('seniority', () => {
  it('writes the month and the year in French', () => {
    expect(memberSince('2026-03-14T10:00:00.000Z')).toBe('mars 2026');
  });
});
