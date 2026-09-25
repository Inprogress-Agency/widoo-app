import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { ApiError, Place, PlaceHours, RouteCard, RouteDetail, RouteSearchQuery, Step } from '.';

// Fictitious data only.
const id = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e10';
const location = { lat: 48.86, lng: 2.35 };
const hours = { weekday: 0, opens: '09:30', closes: '18:00', validFrom: null, validTo: null };
const place = {
  id,
  name: 'Lieu fictif',
  category: 'museum',
  location,
  address: '1 rue Fictive, Paris',
  isIndoor: true,
  photoUrl: null,
  verificationStatus: 'verified',
  verifiedAt: null,
  hours: [hours],
};
const step = {
  id,
  position: 0,
  title: null,
  description: null,
  durationMin: 60,
  costPerPersonEur: 12,
  bookingRequired: false,
  bookingUrl: null,
  bookingProvider: null,
  transitionNote: null,
  transition: { distanceM: 600, durationMin: 8, mode: 'walk', estimated: false },
  place,
};
const card = {
  id,
  title: 'Parcours fictif',
  coverUrl: 'https://example.com/cover.jpg',
  isOfficial: true,
  author: null,
  access: 'free',
  isVerified: true,
  moods: ['culture'],
  audiences: ['couple'],
  district: '3e',
  neighborhood: 'Le Marais',
  durationMin: 180,
  durationBucket: 'half_day',
  budgetPerPersonEur: { min: 20, max: 30 },
  budgetBucket: 'low',
  distanceM: 2400,
  rating: { average: null, count: 0 },
  steps: [{ category: 'museum', location }],
};
const detail = {
  ...card,
  status: 'published',
  description: 'Description fictive',
  photoUrls: [],
  conditions: ['indoor'],
  transport: 'walk',
  walkingDistanceM: 2400,
  steps: [step],
};
const error = { code: 'not_found', message: 'Route not found' };

const cases: [string, z.ZodType, object, object][] = [
  ['PlaceHours', PlaceHours, hours, { opens: '9h30' }],
  ['Place', Place, place, { category: 'Musée' }],
  ['Step', Step, step, { bookingProvider: 'thefork' }],
  ['RouteCard', RouteCard, card, { moods: ['Culture'] }],
  ['RouteCard', RouteCard, card, { access: 'gold' }],
  ['RouteDetail', RouteDetail, detail, { status: 'archived' }],
  ['RouteDetail', RouteDetail, detail, { conditions: ['snowy'] }],
  ['ApiError', ApiError, error, { code: 'teapot' }],
];

describe('response schemas', () => {
  it.each(cases)('%s accepts a valid payload', (_, schema, valid) => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it.each(cases)('%s rejects %o', (_, schema, valid, unknown) => {
    expect(schema.safeParse({ ...valid, ...unknown }).success).toBe(false);
  });

  it('rejects a booking link that is not https', () => {
    expect(Step.safeParse({ ...step, bookingUrl: 'http://example.com' }).success).toBe(false);
  });
});

describe('RouteCard budget and access', () => {
  it('reads the highest budget bucket as high, and keeps premium for the access', () => {
    expect(RouteCard.parse({ ...card, budgetBucket: 'high', access: 'premium' })).toMatchObject({
      budgetBucket: 'high',
      access: 'premium',
    });
    expect(RouteCard.safeParse({ ...card, budgetBucket: 'premium' }).success).toBe(false);
  });
});

describe('RouteSearchQuery', () => {
  const bbox = '2.33,48.85,2.37,48.87';

  it('parses the query string into typed values', () => {
    const query = { bbox, near: '48.86,2.35', moods: 'culture', audiences: ['couple', 'friends'] };
    expect(RouteSearchQuery.parse({ ...query, limit: '10' })).toEqual({
      bbox: { west: 2.33, south: 48.85, east: 2.37, north: 48.87 },
      near: { lat: 48.86, lng: 2.35 },
      moods: ['culture'],
      audiences: ['couple', 'friends'],
      sort: 'recommended',
      limit: 10,
    });
  });

  it('accepts the budget key high, alone or repeated (D-016)', () => {
    expect(RouteSearchQuery.parse({ bbox, budgets: 'high' }).budgets).toEqual(['high']);
    expect(RouteSearchQuery.parse({ bbox, budgets: ['medium', 'high'] }).budgets).toEqual([
      'medium',
      'high',
    ]);
  });

  it.each([
    ['the former budget key premium', { bbox, budgets: 'premium' }],
    ['the former budget key premium among others', { bbox, budgets: ['low', 'premium'] }],
    ['an unknown filter value', { bbox, moods: 'Culture' }],
    ['an unknown sort', { bbox, sort: 'price' }],
    ['a bbox in the wrong order', { bbox: '2.37,48.87,2.33,48.85' }],
    ['a bbox with a missing value', { bbox: '2.33,48.85,,48.87' }],
    ['a limit above 50', { bbox, limit: '51' }],
    ['a distance sort without position', { bbox, sort: 'distance' }],
  ])('rejects %s', (_, query) => {
    expect(RouteSearchQuery.safeParse(query).success).toBe(false);
  });
});
