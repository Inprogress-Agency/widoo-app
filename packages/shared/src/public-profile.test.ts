import { describe, expect, it } from 'vitest';
import { PublicProfile, PublicProfileQueryParams } from '.';

const card = {
  id: '0190a4b2-0000-7000-8000-000000000001',
  title: "Canal Saint-Martin au fil de l'eau",
  coverUrl: null,
  isOfficial: false,
  author: { id: '0190a4b2-0000-7000-8000-000000000002', firstName: 'Camille', avatarUrl: null },
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
};

/** The minimal profile of Ecrans › E-16: a first name, a seniority, one published route. */
const minimal = {
  id: '0190a4b2-0000-7000-8000-000000000002',
  firstName: 'Camille',
  avatarUrl: null,
  createdAt: '2026-03-14T10:00:00.000Z',
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
  routes: { items: [card], nextCursor: null },
  moodCounts: { nature: 1 },
};

describe('PublicProfile', () => {
  it('reads a minimal profile, each missing figure null', () => {
    const profile = PublicProfile.parse(minimal);
    expect(profile.routesCompleted).toBeNull();
    expect(profile.routes.items).toHaveLength(1);
    expect(profile.moodCounts).toEqual({ nature: 1 });
  });

  it('keeps reading a field added later', () => {
    expect(PublicProfile.safeParse({ ...minimal, followers: 3 }).success).toBe(true);
  });

  it.each([
    ['an empty first name', { firstName: '' }],
    ['an http avatar', { avatarUrl: 'http://exemple.fr/a.jpg' }],
    ['a negative figure', { verifiedPlaces: -1 }],
    ['an unknown mood', { moodCounts: { disco: 2 } }],
  ])('rejects %s', (_case, override) => {
    expect(PublicProfile.safeParse({ ...minimal, ...override }).success).toBe(false);
  });
});

describe('PublicProfileQueryParams', () => {
  it('sorts the most recent first, twenty routes a page, by default', () => {
    expect(PublicProfileQueryParams.parse({})).toEqual({ sort: 'recent', limit: 20 });
  });

  it('reads one mood or several, without duplicates', () => {
    expect(PublicProfileQueryParams.parse({ moods: 'food' }).moods).toEqual(['food']);
    expect(
      PublicProfileQueryParams.parse({ moods: ['food', 'nature', 'food'], sort: 'rating' }),
    ).toEqual({ moods: ['food', 'nature'], sort: 'rating', limit: 20 });
  });

  it.each([
    ['an unknown sort', { sort: 'distance' }],
    ['an unknown mood', { moods: ['disco'] }],
    ['an unknown key', { mood: 'food' }],
    ['an empty cursor', { cursor: '' }],
    ['a page too large', { limit: '51' }],
  ])('rejects %s', (_case, query) => {
    expect(PublicProfileQueryParams.safeParse(query).success).toBe(false);
  });
});
