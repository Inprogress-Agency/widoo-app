import type { RouteCard } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { isLocked, routeMarkers, routePath, routeStops, selectionFrame } from './markers';

// Fictitious routes.
function route(id: string, overrides: Partial<RouteCard> = {}): RouteCard {
  return {
    id,
    title: `Parcours ${id}`,
    coverUrl: null,
    isOfficial: true,
    author: null,
    access: 'free',
    isVerified: false,
    moods: ['culture'],
    audiences: [],
    district: null,
    neighborhood: null,
    durationMin: 120,
    durationBucket: '1_2h',
    budgetPerPersonEur: { min: 0, max: 0 },
    budgetBucket: 'free',
    distanceM: 1500,
    rating: { average: null, count: 0 },
    steps: [
      { category: 'museum', location: { lat: 48.86, lng: 2.34 } },
      { category: 'cafe', location: { lat: 48.87, lng: 2.35 } },
      { category: 'park', location: { lat: 48.865, lng: 2.33 } },
    ],
    ...overrides,
  };
}

describe('routeMarkers', () => {
  it('places one marker per route at its start, named after the route', () => {
    const markers = routeMarkers([route('a'), route('b', { steps: [] })]);
    expect(markers.features).toHaveLength(1);
    expect(markers.features[0]?.geometry.coordinates).toEqual([2.34, 48.86]);
    expect(markers.features[0]?.properties).toEqual({ routeId: 'a', image: 'route-a' });
  });
});

describe('isLocked', () => {
  it('locks a Premium route for a user without subscription only', () => {
    expect(isLocked({ access: 'premium' }, false)).toBe(true);
    expect(isLocked({ access: 'premium' }, true)).toBe(false);
    expect(isLocked({ access: 'free' }, false)).toBe(false);
  });
});

describe('selected route', () => {
  it('draws the path and every step dot by category', () => {
    const selected = route('a');
    expect(routePath(selected)?.geometry.coordinates).toEqual([
      [2.34, 48.86],
      [2.35, 48.87],
      [2.33, 48.865],
    ]);
    const categories = routeStops(selected, false).map((stop) => stop.category);
    expect(categories).toEqual(['museum', 'cafe', 'park']);
  });

  it('shows only the locked start of a Premium route without subscription', () => {
    const stops = routeStops(route('a', { access: 'premium' }), true);
    expect(stops).toEqual([{ key: 'a-0', location: [2.34, 48.86], category: null }]);
  });

  it('frames the steps, or the start alone when locked', () => {
    expect(selectionFrame(route('a'), false)).toEqual({
      bounds: { ne: [2.35, 48.87], sw: [2.33, 48.86] },
    });
    expect(selectionFrame(route('a'), true)).toEqual({ center: [2.34, 48.86] });
    expect(selectionFrame(route('b', { steps: [] }), false)).toBeNull();
  });

  it('has no path for a single step', () => {
    const single = route('a', { steps: route('a').steps.slice(0, 1) });
    expect(routePath(single)).toBeNull();
    expect(selectionFrame(single, false)).toEqual({ center: [2.34, 48.86] });
  });
});
