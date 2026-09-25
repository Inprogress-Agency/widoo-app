import type { RouteCard } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '.';
import { searchQueryString } from './search';

const bbox = { west: 2.33, south: 48.85, east: 2.37, north: 48.88 };

// Fictitious route.
const card: RouteCard = {
  id: '01890000-0000-7000-8000-000000000010',
  title: 'Le canal en douceur',
  coverUrl: 'https://images.example.com/canal.jpg',
  isOfficial: true,
  author: null,
  access: 'free',
  isVerified: true,
  moods: ['relax'],
  audiences: ['couple'],
  district: '10e',
  neighborhood: 'Canal Saint-Martin',
  durationMin: 180,
  durationBucket: 'half_day',
  budgetPerPersonEur: { min: 0, max: 15 },
  budgetBucket: 'low',
  distanceM: 3200,
  rating: { average: 4.6, count: 12 },
  steps: [{ category: 'walk', location: { lat: 48.871, lng: 2.365 } }],
};

describe('searchQueryString', () => {
  it('writes the zone west, south, east, north', () => {
    expect(searchQueryString({ bbox })).toBe('bbox=2.33%2C48.85%2C2.37%2C48.88');
  });

  it('repeats the key of a list filter and leaves empty filters out', () => {
    const query = new URLSearchParams(
      searchQueryString({ bbox, moods: ['food', 'nature'], audiences: [], sort: 'rating' }),
    );
    expect(query.getAll('moods')).toEqual(['food', 'nature']);
    expect(query.has('audiences')).toBe(false);
    expect(query.get('sort')).toBe('rating');
  });

  it('sends the page and the position only when given', () => {
    const query = new URLSearchParams(
      searchQueryString({ bbox, near: { lat: 48.86, lng: 2.35 }, cursor: 'abc', limit: 50 }),
    );
    expect(query.get('near')).toBe('48.86,2.35');
    expect(query.get('cursor')).toBe('abc');
    expect(query.get('limit')).toBe('50');
    expect(new URLSearchParams(searchQueryString({ bbox })).has('near')).toBe(false);
  });
});

describe('searchRoutes', () => {
  it('reads the cards of a zone without token', async () => {
    const body = { items: [card], nextCursor: null, clusters: null };
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(body));
    const getToken = vi.fn(async () => 'token-1');
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, getToken });

    await expect(client.searchRoutes({ bbox })).resolves.toEqual(body);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'http://10.0.2.2:8080/v1/routes/search?bbox=2.33%2C48.85%2C2.37%2C48.88',
    );
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe('countRoutes', () => {
  it('counts the routes of a zone with its filters, without token', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ count: 124 }));
    const getToken = vi.fn(async () => 'token-1');
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, getToken });

    await expect(client.countRoutes({ bbox, moods: ['nature'] })).resolves.toEqual({ count: 124 });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'http://10.0.2.2:8080/v1/routes/search/count?bbox=2.33%2C48.85%2C2.37%2C48.88&moods=nature',
    );
    expect(getToken).not.toHaveBeenCalled();
  });
});
