import type { RouteCard } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { routeMarkers, routePath, routeStops, selectionFrame } from './markers';

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
    budgetPerPersonEur: 0,
    budgetBucket: 'free',
    distanceM: 1500,
    rating: { average: null, count: 0 },
    isLocked: false,
    stepCount: 3,
    steps: [
      {
        category: 'museum',
        location: { lat: 48.86, lng: 2.34 },
        name: 'Musée fictif',
        durationMin: 45,
      },
      {
        category: 'cafe',
        location: { lat: 48.87, lng: 2.35 },
        name: 'Café fictif',
        durationMin: 30,
      },
      {
        category: 'park',
        location: { lat: 48.865, lng: 2.33 },
        name: 'Parc fictif',
        durationMin: 20,
      },
    ],
    ...overrides,
  };
}

/** A locked Premium card, as the search sends it: its start alone, its steps counted (D-014). */
function locked(id: string): RouteCard {
  return route(id, { access: 'premium', isLocked: true, steps: route(id).steps.slice(0, 1) });
}

/** A Premium card unlocked for a caller with the right to it: every step (D-075). */
function unlocked(id: string): RouteCard {
  return route(id, { access: 'premium', isLocked: false });
}

describe('routeMarkers', () => {
  const durationOf = (card: RouteCard) => `${card.durationMin} min`;

  it('places one marker per route at its start, named after the route', () => {
    const markers = routeMarkers([route('a'), route('b', { steps: [] })], {
      isDrawn: () => true,
      durationOf,
    });
    expect(markers.features).toHaveLength(1);
    expect(markers.features[0]?.geometry.coordinates).toEqual([2.34, 48.86]);
    expect(markers.features[0]?.properties).toEqual({
      routeId: 'a',
      image: 'route-a',
      duration: '120 min',
    });
  });

  it('shows the empty photo box until the image of the route is drawn', () => {
    const markers = routeMarkers([route('a'), route('b')], {
      isDrawn: (image) => image === 'route-b',
      durationOf,
    });
    expect(markers.features.map((feature) => feature.properties.image)).toEqual([
      'marker-empty',
      'route-b',
    ]);
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
    const categories = routeStops(selected).map((stop) => stop.category);
    expect(categories).toEqual(['museum', 'cafe', 'park']);
  });

  it('shows a locked card as its start alone, locked, framed at the current zoom (D-014)', () => {
    const card = locked('a');
    expect(routePath(card)).toBeNull();
    expect(routeStops(card)).toEqual([{ key: 'a-0', location: [2.34, 48.86], category: null }]);
    expect(selectionFrame(card)).toEqual({ center: [2.34, 48.86] });
  });

  it('keeps a locked card to its start, whatever steps it would carry', () => {
    const card = route('a', { access: 'premium', isLocked: true });
    expect(routePath(card)).toBeNull();
    expect(routeStops(card)).toEqual([{ key: 'a-0', location: [2.34, 48.86], category: null }]);
    expect(selectionFrame(card)).toEqual({ center: [2.34, 48.86] });
  });

  it('draws an unlocked Premium card as a free one: path, steps and frame (D-075)', () => {
    const card = unlocked('a');
    const free = route('a');
    expect(routePath(card)).toEqual(routePath(free));
    expect(routeStops(card)).toEqual(routeStops(free));
    expect(selectionFrame(card)).toEqual({ bounds: { ne: [2.35, 48.87], sw: [2.33, 48.86] } });
  });

  it('frames the steps, and nothing without a step', () => {
    expect(selectionFrame(route('a'))).toEqual({
      bounds: { ne: [2.35, 48.87], sw: [2.33, 48.86] },
    });
    expect(selectionFrame(route('b', { steps: [] }))).toBeNull();
  });

  it('has no path for a single step', () => {
    const single = route('a', { stepCount: 1, steps: route('a').steps.slice(0, 1) });
    expect(routePath(single)).toBeNull();
    expect(selectionFrame(single)).toEqual({ center: [2.34, 48.86] });
  });
});
