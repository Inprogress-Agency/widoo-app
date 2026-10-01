import { describe, expect, it } from 'vitest';
import { apiRoute } from '@/test/api-route';
import { toSharedRouteResult } from './from-api';

const id = apiRoute.id;

describe('toSharedRouteResult', () => {
  it('reads a published route into the card of the page', () => {
    expect(toSharedRouteResult(200, apiRoute)).toEqual({
      kind: 'public',
      route: {
        id,
        title: 'Montmartre sans les touristes',
        coverUrl: 'https://photos.example/montmartre.jpg',
        mood: 'culture',
        district: '18e',
        neighborhood: 'Abbesses',
        durationMin: 420,
        budgetPerPersonEur: 38,
        distanceM: 6100,
        stepCount: 4,
        rating: { average: 4.9, count: 128 },
        author: { kind: 'member', firstName: 'Camille' },
        access: 'free',
      },
    });
  });

  it('never carries the content of the steps, only their number', () => {
    const result = toSharedRouteResult(200, apiRoute);
    expect(JSON.stringify(result)).not.toContain('Place des Abbesses');
  });

  it('reads a private route, a route of the team and a route without review', () => {
    const result = toSharedRouteResult(200, {
      ...apiRoute,
      status: 'private',
      isOfficial: true,
      author: null,
      rating: { average: null, count: 0 },
    });
    expect(result).toMatchObject({
      kind: 'private',
      route: { author: { kind: 'widoo' }, rating: null },
    });
  });

  it('keeps a published route flagged by the nightly check public', () => {
    expect(toSharedRouteResult(200, { ...apiRoute, status: 'needs_fix' }).kind).toBe('public');
  });

  it('shows a route no longer public as removed', () => {
    expect(toSharedRouteResult(200, { ...apiRoute, status: 'unpublished' })).toEqual({
      kind: 'removed',
      removedAt: null,
    });
  });

  it('reads a removed route with or without its date', () => {
    expect(toSharedRouteResult(410, { removedAt: '2026-09-20T09:00:00Z' })).toEqual({
      kind: 'removed',
      removedAt: '2026-09-20T09:00:00Z',
    });
    expect(toSharedRouteResult(410, null)).toEqual({ kind: 'removed', removedAt: null });
  });

  it('reads an unknown route', () => {
    expect(toSharedRouteResult(404, { code: 'not_found' })).toEqual({ kind: 'unknown' });
  });

  it('leaves any other answer and a malformed route to the error page', () => {
    expect(() => toSharedRouteResult(500, null)).toThrow(/500/);
    expect(() => toSharedRouteResult(200, { ...apiRoute, title: '' })).toThrow();
  });
});
