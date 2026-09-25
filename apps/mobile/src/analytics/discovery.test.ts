import { checkAnalyticsEvent } from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  analyticsZoom,
  mapSearchZoneEvent,
  newCardViews,
  routeOpenedEvent,
  watchAppOpened,
} from './discovery';

/** Each event built here must pass the catalog as it is: `track` would refuse it otherwise. */
function expectInCatalog(name: string, properties: object) {
  expect(checkAnalyticsEvent(name, properties)).toEqual({ success: true, properties });
}

describe('mapSearchZoneEvent', () => {
  const view = { bbox: { west: 2.3312, south: 48.8531, east: 2.3721, north: 48.8804 } };

  it('sends the trigger, the zoom to a tenth and the count, never the zone', () => {
    const event = mapSearchZoneEvent({ trigger: 'button', view: { ...view, zoom: 14.4567 } }, 18);
    expect(event).toEqual({ trigger: 'button', zoom: 14.5, results_count: 18 });
    expectInCatalog('map_search_zone', event);
  });

  it('reports the first search of the map, even empty', () => {
    const event = mapSearchZoneEvent({ trigger: 'initial', view: { ...view, zoom: 13 } }, 0);
    expect(event).toEqual({ trigger: 'initial', zoom: 13, results_count: 0 });
    expectInCatalog('map_search_zone', event);
  });

  it('rounds the zoom to a tenth of a level', () => {
    expect(analyticsZoom(12.04)).toBe(12);
    expect(analyticsZoom(12.05)).toBe(12.1);
  });
});

describe('newCardViews', () => {
  const card = (id: string, index: number) => ({ route: { id }, index });

  it('reports each card once, with its position and the detent of the sheet', () => {
    const seen = new Set<string>();
    const first = newCardViews([card('a', 0), card('b', 1)], seen, 'rest');
    expect(first).toEqual([
      { route_id: 'a', position: 0, sheet_level: 'rest' },
      { route_id: 'b', position: 1, sheet_level: 'rest' },
    ]);
    const next = newCardViews([card('b', 1), card('c', 2)], seen, 'half');
    expect(next).toEqual([{ route_id: 'c', position: 2, sheet_level: 'half' }]);
    for (const view of [...first, ...next]) {
      expectInCatalog('result_card_viewed', view);
    }
  });
});

describe('routeOpenedEvent', () => {
  it.each(['marker', 'card'] as const)('tells a route opened from a %s', (source) => {
    const event = routeOpenedEvent({ id: 'route-1' }, source);
    expect(event).toEqual({ route_id: 'route-1', source });
    expectInCatalog('route_opened', event);
  });
});

describe('watchAppOpened', () => {
  type State = 'active' | 'background' | 'inactive';
  type Listener = (next: State) => void;

  function fakeAppState() {
    let listener: Listener | undefined;
    const remove = vi.fn();
    return {
      remove,
      change: (next: State) => listener?.(next),
      appState: {
        currentState: 'active' as const,
        addEventListener: (_type: 'change', next: Listener) => {
          listener = next;
          return { remove };
        },
      },
    };
  }

  it('sends a cold start, then a warm one at each return from the background', () => {
    const { appState, change, remove } = fakeAppState();
    const track = vi.fn();
    const stop = watchAppOpened(appState, track);
    change('inactive');
    change('active');
    change('background');
    change('active');
    expect(track.mock.calls).toEqual([[{ cold_start: true }], [{ cold_start: false }]]);
    for (const [properties] of track.mock.calls) {
      expectInCatalog('app_opened', properties);
    }
    stop();
    expect(remove).toHaveBeenCalledOnce();
  });
});
