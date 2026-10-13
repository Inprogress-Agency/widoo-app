import { describe, expect, it } from 'vitest';
import {
  Anecdote,
  Anecdotes,
  Bio,
  certificationCriteriaOf,
  certificationThresholdsOf,
  CertifiedOverride,
  defaultCertificationThresholds,
  FeaturedRouteIds,
  isCertifiedWith,
  ProfileSlot,
} from '.';

const routeIds = [
  '01997a4e-8c00-7000-8000-000000000101',
  '01997a4e-8c00-7000-8000-000000000102',
  '01997a4e-8c00-7000-8000-000000000103',
  '01997a4e-8c00-7000-8000-000000000104',
];

describe('Bio', () => {
  it('accepts 150 characters and trims', () => {
    expect(Bio.parse(` ${'a'.repeat(150)} `)).toBe('a'.repeat(150));
  });

  it.each(['', 'a'.repeat(151), '<script>', 'Line\nbreak'])('rejects %j', (bio) => {
    expect(Bio.safeParse(bio).success).toBe(false);
  });
});

describe('ProfileSlot', () => {
  it.each([
    [1, true],
    [3, true],
    [0, false],
    [4, false],
    [1.5, false],
  ])('%d is a slot: %s', (position, expected) => {
    expect(ProfileSlot.safeParse(position).success).toBe(expected);
  });
});

describe('Anecdotes', () => {
  const anecdote = (questionKey: string) => ({ questionKey, answer: 'Le canal Saint-Martin.' });

  it('accepts three anecdotes on different questions', () => {
    const anecdotes = ['ideal_sunday', 'hidden_gem', 'work_cafe'].map(anecdote);
    expect(Anecdotes.parse(anecdotes)).toEqual(anecdotes);
  });

  it.each([
    ['a fourth anecdote', ['ideal_sunday', 'hidden_gem', 'work_cafe', 'best_memory']],
    ['two answers to one question', ['ideal_sunday', 'ideal_sunday']],
  ])('rejects %s', (_, keys) => {
    expect(Anecdotes.safeParse(keys.map(anecdote)).success).toBe(false);
  });

  it.each([
    ['an answer over 150 characters', { questionKey: 'hidden_gem', answer: 'a'.repeat(151) }],
    ['an empty answer', { questionKey: 'hidden_gem', answer: '  ' }],
    ['a question key that is a label', { questionKey: 'Mon café', answer: 'Ici.' }],
  ])('rejects %s', (_, value) => {
    expect(Anecdote.safeParse(value).success).toBe(false);
  });
});

describe('FeaturedRouteIds', () => {
  it('accepts up to three distinct routes', () => {
    expect(FeaturedRouteIds.parse(routeIds.slice(0, 3))).toEqual(routeIds.slice(0, 3));
  });

  it.each([
    ['four routes', routeIds],
    ['a route twice', [routeIds[0], routeIds[0]]],
    ['an id that is not a uuid', ['marais-gourmand']],
  ])('rejects %s', (_, ids) => {
    expect(FeaturedRouteIds.safeParse(ids).success).toBe(false);
  });
});

describe('CertifiedOverride', () => {
  it('holds the three choices of the admin, none by default in the database', () => {
    expect(CertifiedOverride.options).toEqual(['none', 'granted', 'revoked']);
  });
});

describe('certificationThresholdsOf', () => {
  it('reads each criterion from its settings key', () => {
    expect(
      certificationThresholdsOf({
        'certification.min_verified_routes': 5,
        'certification.min_rating': 4,
        'certification.min_completed_routes': 10,
      }),
    ).toEqual({ minVerifiedRoutes: 5, minRating: 4, minCompletedRoutes: 10 });
  });

  it('is the wiki defaults without any row', () => {
    expect(certificationThresholdsOf({})).toEqual({
      minVerifiedRoutes: 3,
      minRating: 4.5,
      minCompletedRoutes: 3,
    });
  });

  it.each([
    ['a rating above 5', 'certification.min_rating', 6],
    ['a negative count', 'certification.min_verified_routes', -1],
    ['a fractional count', 'certification.min_completed_routes', 2.5],
    ['a string', 'certification.min_rating', '4.5'],
  ])('falls back to the default on %s', (_, key, value) => {
    expect(certificationThresholdsOf({ [key]: value })).toEqual(defaultCertificationThresholds);
  });

  it('keeps the valid criteria next to an invalid one', () => {
    expect(
      certificationThresholdsOf({
        'certification.min_rating': 'high',
        'certification.min_completed_routes': 5,
      }),
    ).toEqual({ ...defaultCertificationThresholds, minCompletedRoutes: 5 });
  });
});

describe('certificationCriteriaOf', () => {
  it('lists the three criteria in the order of the sheet, met at the threshold', () => {
    const values = { verifiedRoutes: 3, averageRating: 4.4, completedRoutes: 23 };
    expect(certificationCriteriaOf(values, defaultCertificationThresholds)).toEqual([
      { criterion: 'verifiedRoutes', value: 3, threshold: 3, isMet: true },
      { criterion: 'averageRating', value: 4.4, threshold: 4.5, isMet: false },
      { criterion: 'completedRoutes', value: 23, threshold: 3, isMet: true },
    ]);
  });

  it('never meets the rating without any rating, even at a zero threshold', () => {
    const values = { verifiedRoutes: 0, averageRating: null, completedRoutes: 0 };
    const thresholds = { minVerifiedRoutes: 0, minRating: 0, minCompletedRoutes: 0 };
    expect(certificationCriteriaOf(values, thresholds).map((c) => c.isMet)).toEqual([
      true,
      false,
      true,
    ]);
  });
});

describe('isCertifiedWith', () => {
  it.each([
    [false, 'none', false],
    [true, 'none', true],
    [false, 'granted', true],
    [true, 'revoked', false],
  ] as const)('computed %s with override %s is %s', (computed, override, expected) => {
    expect(isCertifiedWith(computed, override)).toBe(expected);
  });
});
