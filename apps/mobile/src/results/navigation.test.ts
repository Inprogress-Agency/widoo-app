import { checkAnalyticsEvent } from '@widoo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const track = vi.fn();
vi.mock('expo-router', () => ({ router: { push } }));
vi.mock('../analytics', () => ({ analytics: { track } }));

const { openRoute, openSection, routeHref } = await import('./navigation');

// Fictitious route: only its id is read.
const route = { id: 'route-1' } as Parameters<typeof openRoute>[0];

/** The event tracked, which must pass the catalog as it is. */
function tracked(): [string, object] {
  expect(track).toHaveBeenCalledTimes(1);
  const [name, properties] = track.mock.calls[0] as [string, object];
  expect(checkAnalyticsEvent(name, properties)).toEqual({ success: true, properties });
  return [name, properties];
}

describe('routeHref', () => {
  it('opens the route sheet at its top', () => {
    expect(routeHref({ id: 'route-1' })).toEqual({
      pathname: '/route/[id]',
      params: { id: 'route-1' },
    });
  });

  it('opens the route sheet at the step of a step tooltip', () => {
    expect(routeHref({ id: 'route-1' }, 3)).toEqual({
      pathname: '/route/[id]',
      params: { id: 'route-1', step: '3' },
    });
  });
});

describe('openRoute', () => {
  beforeEach(() => {
    push.mockClear();
    track.mockClear();
  });

  it('sends route_opened with the step, from 0, from « Voir plus » of a tapped step', () => {
    openRoute(route, 'marker', { position: 3, isTapped: true });
    expect(tracked()).toEqual([
      'route_opened',
      { route_id: 'route-1', source: 'marker', step_index: 2 },
    ]);
    expect(push).toHaveBeenCalledWith(routeHref(route, 3));
  });

  it('sends the start when the user tapped it', () => {
    openRoute(route, 'marker', { position: 1, isTapped: true });
    expect(tracked()).toEqual([
      'route_opened',
      { route_id: 'route-1', source: 'marker', step_index: 0 },
    ]);
  });

  it('sends no step from the tooltip of the start, nor from a card', () => {
    openRoute(route, 'marker', { position: 1, isTapped: false });
    expect(tracked()).toEqual(['route_opened', { route_id: 'route-1', source: 'marker' }]);
    expect(push).toHaveBeenCalledWith(routeHref(route, 1));
    track.mockClear();
    openRoute(route, 'card');
    expect(tracked()).toEqual(['route_opened', { route_id: 'route-1', source: 'card' }]);
    expect(push).toHaveBeenLastCalledWith(routeHref(route));
  });
});

describe('openSection', () => {
  beforeEach(() => {
    push.mockClear();
    track.mockClear();
  });

  it('sends section_opened from « Voir tout », then opens the list', () => {
    openSection('nearby', { sheet_level: 'half', sort: 'recommended', results_count: 9 });
    expect(tracked()).toEqual([
      'section_opened',
      { section: 'nearby', sheet_level: 'half', sort: 'recommended', results_count: 9 },
    ]);
    expect(push).toHaveBeenCalledWith({ pathname: '/section/[id]', params: { id: 'nearby' } });
  });
});
