import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  ApiError,
  Place,
  PlaceHours,
  RouteCard,
  RouteCount,
  RouteCountQuery,
  RouteDetail,
  RouteSearchQuery,
  RouteSearchResult,
  Step,
} from '.';

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
  conditions: [],
  transport: 'walk',
  district: '3e',
  neighborhood: 'Le Marais',
  durationMin: 180,
  durationBucket: 'half_day',
  budgetPerPersonEur: 25,
  budgetBucket: 'low',
  distanceM: 2400,
  rating: { average: null, count: 0 },
  isLocked: false,
  stepCount: 1,
  steps: [{ category: 'museum', location, name: 'Musée fictif', durationMin: 45 }],
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

  it('carries the budget as a single sum per person, never a range (D-032)', () => {
    expect(RouteCard.parse({ ...card, budgetPerPersonEur: 22.5 }).budgetPerPersonEur).toBe(22.5);
    expect(RouteCard.parse({ ...card, budgetPerPersonEur: 0 }).budgetPerPersonEur).toBe(0);
    expect(RouteCard.safeParse({ ...card, budgetPerPersonEur: { min: 20, max: 30 } }).success).toBe(
      false,
    );
    expect(RouteCard.safeParse({ ...card, budgetPerPersonEur: -5 }).success).toBe(false);
  });
});

describe('RouteCard steps', () => {
  const start = { category: 'museum', location, name: null, durationMin: null };
  const next = {
    category: 'cafe',
    location: { lat: 48.87, lng: 2.36 },
    name: null,
    durationMin: null,
  };
  const locked = { ...card, access: 'premium', isLocked: true, stepCount: 4 };

  it('counts the steps of a locked card it carries the start of alone (D-014)', () => {
    expect(RouteCard.parse({ ...locked, steps: [start] })).toMatchObject({
      isLocked: true,
      stepCount: 4,
      steps: [start],
    });
  });

  it('refuses a locked card carrying a step after its start', () => {
    expect(RouteCard.safeParse({ ...locked, steps: [start, next] }).success).toBe(false);
  });

  it('refuses a locked card naming its start or giving its time on the spot', () => {
    const named = { ...start, name: 'Musée fictif' };
    const timed = { ...start, durationMin: 45 };
    expect(RouteCard.safeParse({ ...locked, steps: [named] }).success).toBe(false);
    expect(RouteCard.safeParse({ ...locked, steps: [timed] }).success).toBe(false);
  });

  it('carries every step of an unlocked Premium card, as a free one (D-075)', () => {
    const steps = [card.steps[0], { ...next, name: 'Café fictif', durationMin: 30 }];
    const unlocked = { ...card, access: 'premium', isLocked: false, stepCount: 2, steps };
    expect(RouteCard.parse(unlocked)).toMatchObject({ isLocked: false, steps });
    expect(RouteCard.safeParse({ ...unlocked, steps: steps.slice(0, 1) }).success).toBe(false);
  });

  it('never locks a free route', () => {
    expect(RouteCard.safeParse({ ...locked, access: 'free', steps: [start] }).success).toBe(false);
  });

  it('refuses a free card without all its steps', () => {
    expect(RouteCard.safeParse({ ...card, stepCount: 2 }).success).toBe(false);
  });

  it('requires the step count and the lock', () => {
    expect(RouteCard.safeParse({ ...card, stepCount: undefined }).success).toBe(false);
    expect(RouteCard.safeParse({ ...card, isLocked: undefined }).success).toBe(false);
  });
});

describe('RouteCard reason', () => {
  it('reads a card without reason, with a null one, or with a reason key', () => {
    expect(RouteCard.parse(card).reason).toBeUndefined();
    expect(RouteCard.parse({ ...card, reason: null }).reason).toBeNull();
    expect(RouteCard.parse({ ...card, reason: { key: 'verified' } }).reason).toEqual({
      key: 'verified',
    });
  });

  it('requires the distance of near_you, and only a known key', () => {
    expect(
      RouteCard.parse({ ...card, reason: { key: 'near_you', distanceM: 600 } }).reason,
    ).toEqual({ key: 'near_you', distanceM: 600 });
    expect(RouteCard.safeParse({ ...card, reason: { key: 'near_you' } }).success).toBe(false);
    expect(RouteCard.safeParse({ ...card, reason: { key: 'Très bien noté' } }).success).toBe(false);
  });
});

describe('RouteSearchQuery', () => {
  const bbox = '2.33,48.85,2.37,48.87';

  it('takes a title text, trimmed, of 2 to 100 characters', () => {
    expect(RouteSearchQuery.parse({ bbox, q: ' canal ' }).q).toBe('canal');
    expect(RouteSearchQuery.safeParse({ bbox, q: 'c' }).success).toBe(false);
    expect(RouteSearchQuery.safeParse({ bbox, q: 'c'.repeat(101) }).success).toBe(false);
    expect(RouteCountQuery.parse({ bbox, q: 'canal' }).q).toBe('canal');
  });

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

  it('drops a repeated filter value', () => {
    expect(RouteSearchQuery.parse({ bbox, moods: ['food', 'food'] }).moods).toEqual(['food']);
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
    ['an unknown key', { bbox, mood: 'food' }],
    ['a bracketed key the API did not normalize', { bbox, 'budgets[]': 'high' }],
    ['a repeated limit', { bbox, limit: ['10', '20'] }],
    ['a count breakdown', { bbox, breakdown: 'all_but_one' }],
  ])('rejects %s', (_, query) => {
    expect(RouteSearchQuery.safeParse(query).success).toBe(false);
  });
});

describe('RouteCountQuery', () => {
  const bbox = '2.33,48.85,2.37,48.87';

  it('takes the search query and the all_but_one breakdown', () => {
    expect(RouteCountQuery.parse({ bbox, moods: 'food', breakdown: 'all_but_one' })).toMatchObject({
      moods: ['food'],
      breakdown: 'all_but_one',
    });
  });

  it.each([
    ['another breakdown', { bbox, breakdown: 'each_value' }],
    ['an unknown key', { bbox, city: 'paris' }],
  ])('rejects %s', (_, query) => {
    expect(RouteCountQuery.safeParse(query).success).toBe(false);
  });
});

describe('search answers', () => {
  it('list cards or clusters, and counts by filter group only', () => {
    const cluster = { center: { lat: 48.86, lng: 2.35 }, count: 3 };
    expect(RouteSearchResult.parse({ items: [], nextCursor: null, clusters: [cluster] })).toEqual({
      items: [],
      nextCursor: null,
      clusters: [cluster],
    });
    expect(RouteCount.parse({ count: 0, without: { moods: 4 } })).toEqual({
      count: 0,
      without: { moods: 4 },
    });
    expect(RouteCount.safeParse({ count: 0, without: { food: 4 } }).success).toBe(false);
  });
});
