import type { RouteCard } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '.';
import { searchQueryString, type RouteCountParams } from './search';

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
  conditions: [],
  transport: 'walk',
  district: '10e',
  neighborhood: 'Canal Saint-Martin',
  durationMin: 180,
  durationBucket: 'half_day',
  budgetPerPersonEur: 8,
  budgetBucket: 'low',
  distanceM: 3200,
  rating: { average: 4.6, count: 12 },
  isLocked: false,
  stepCount: 1,
  steps: [
    {
      category: 'walk',
      location: { lat: 48.871, lng: 2.365 },
      name: 'Canal Saint-Martin',
      durationMin: 60,
    },
  ],
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
  const body = { items: [card], nextCursor: null, clusters: null };
  const url = 'http://10.0.2.2:8080/v1/routes/search?bbox=2.33%2C48.85%2C2.37%2C48.88';
  const headersOf = (fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>, call = 0) =>
    new Headers(fetch.mock.calls[call]?.[1]?.headers);

  it('reads the cards of a zone without token when there is none', async () => {
    for (const getToken of [undefined, vi.fn(async () => null)]) {
      const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(body));
      const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, getToken });

      await expect(client.searchRoutes({ bbox })).resolves.toEqual(body);
      expect(fetch.mock.calls[0]?.[0]).toBe(url);
      expect(headersOf(fetch).has('authorization')).toBe(false);
    }
  });

  it('sends the token of the signed-in user when there is one (D-075)', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(body));
    const getToken = vi.fn(async () => 'token-1');
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, getToken });

    await expect(client.searchRoutes({ bbox })).resolves.toEqual(body);
    expect(getToken).toHaveBeenCalledWith({ forceRefresh: false });
    expect(headersOf(fetch).get('authorization')).toBe('Bearer token-1');
  });

  it('refreshes an expired token once, never falling back without it', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(body));
    fetch.mockResolvedValueOnce(
      Response.json({ code: 'unauthorized', message: 'Invalid token' }, { status: 401 }),
    );
    const getToken = vi.fn(async ({ forceRefresh }: { forceRefresh: boolean }) =>
      forceRefresh ? 'token-2' : 'token-1',
    );
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, getToken });

    await expect(client.searchRoutes({ bbox })).resolves.toEqual(body);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(headersOf(fetch, 1).get('authorization')).toBe('Bearer token-2');
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

  it('asks the count without each active group', async () => {
    const body = { count: 0, without: { moods: 12, durations: 3 } };
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(body));
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch });

    const params: RouteCountParams = {
      bbox,
      moods: ['nature'],
      durations: ['weekend'],
      breakdown: 'all_but_one',
    };
    await expect(client.countRoutes(params)).resolves.toEqual(body);
    const query = new URL(String(fetch.mock.calls[0]?.[0])).searchParams;
    expect(query.get('breakdown')).toBe('all_but_one');
    expect(query.getAll('durations')).toEqual(['weekend']);
  });
});
