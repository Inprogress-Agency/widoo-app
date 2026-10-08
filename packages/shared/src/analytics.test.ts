import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AnalyticsCommonProperties,
  analyticsEvents,
  checkAnalyticsEvent,
  type AnalyticsEventArgs,
  type AnalyticsEventName,
} from './analytics';
import { discoverySections } from './sections';

const noFilters = {
  audiences: [],
  moods: [],
  conditions: [],
  durations: [],
  budgets: [],
  transports: [],
};

// Checked by `tsc`: each `@ts-expect-error` fails the typecheck if the call becomes valid.
const track: <E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEventArgs<E>
) => void = () => {};

describe('AnalyticsEventArgs', () => {
  it('requires the properties of an event', () => {
    track('app_opened', { cold_start: true });
    track('route_opened', { route_id: 'route-1', source: 'card' });
    // @ts-expect-error missing properties
    track('app_opened');
    // @ts-expect-error missing property
    track('route_opened', { route_id: 'route-1' });
    // @ts-expect-error value outside the list of the wiki
    track('route_opened', { route_id: 'route-1', source: 'push' });
    // @ts-expect-error unknown property
    track('app_opened', { cold_start: true, email: 'someone@example.com' });
  });

  it('takes no properties for an event without any', () => {
    track('create_started');
    expectTypeOf<AnalyticsEventArgs<'reminder_tapped'>>().toEqualTypeOf<[]>();
  });

  it('refuses an unknown event', () => {
    // @ts-expect-error not in the list of the wiki
    track('screen_viewed', {});
    // @ts-expect-error the list view and its switch are gone (Ecrans › E-01)
    track('view_switched', { to: 'list' });
    // @ts-expect-error the weather banner is gone (D-010, D-067)
    track('weather_banner_shown', { condition: 'rainy' });
  });
});

describe('checkAnalyticsEvent', () => {
  it('accepts an event of the catalog with its properties', () => {
    expect(
      checkAnalyticsEvent('map_search_zone', { zoom: 14.5, results_count: 3, trigger: 'button' }),
    ).toEqual({
      success: true,
      properties: { zoom: 14.5, results_count: 3, trigger: 'button' },
    });
    expect(checkAnalyticsEvent('create_started', undefined)).toEqual({
      success: true,
      properties: {},
    });
  });

  it('refuses an event the page Analytics does not name', () => {
    expect(checkAnalyticsEvent('screen_viewed', {})).toEqual({
      success: false,
      error: 'Unknown analytics event: screen_viewed',
    });
    expect(checkAnalyticsEvent('toString', {}).success).toBe(false);
  });

  it('refuses a property outside the schema, naming it without its value', () => {
    const check = checkAnalyticsEvent('app_opened', {
      cold_start: true,
      email: 'someone@example.com',
    });
    expect(check).toEqual({ success: false, error: 'Invalid app_opened: unknown email' });
  });

  it('refuses a missing property and a value outside its list', () => {
    expect(checkAnalyticsEvent('route_opened', { route_id: 'route-1' }).success).toBe(false);
    expect(
      checkAnalyticsEvent('route_opened', { route_id: 'route-1', source: 'push' }).success,
    ).toBe(false);
    expect(
      checkAnalyticsEvent('result_card_viewed', {
        route_id: 'route-1',
        position: -1,
        section: 'nearby',
        sheet_level: 'rest',
      }).success,
    ).toBe(false);
  });

  it('never lets a position through the map event', () => {
    const zone = { zoom: 14.5, results_count: 3, trigger: 'initial' };
    for (const extra of [
      { bbox: [2.33, 48.85, 2.37, 48.88] },
      { latitude: 48.8566, longitude: 2.3522 },
      { center: { lat: 48.8566, lng: 2.3522 } },
    ]) {
      expect(checkAnalyticsEvent('map_search_zone', { ...zone, ...extra }).success).toBe(false);
    }
  });
});

describe('AnalyticsCommonProperties', () => {
  const common = { app_version: '0.1.0', platform: 'ios', is_authenticated: false };

  it('takes a city slug, never a coordinate', () => {
    expect(AnalyticsCommonProperties.safeParse({ ...common, city: 'paris' }).success).toBe(true);
    expect(
      AnalyticsCommonProperties.safeParse({ ...common, city: 'aix-en-provence' }).success,
    ).toBe(true);
    for (const city of ['48.8566,2.3522', 'Paris 10e', '75010', '']) {
      expect(AnalyticsCommonProperties.safeParse({ ...common, city }).success).toBe(false);
    }
  });
});

describe('events of D-023, D-029 and D-033', () => {
  const route_id = 'route-1';
  const valid: Partial<Record<AnalyticsEventName, unknown>> = {
    paywall_shown: { reason: 'premium_route', source: 'route' },
    certified_info_opened: { creator_id: 'user-1', own: false },
    profile_updated: { fields: ['photo', 'neighborhood'] },
    go_arrived: { route_id, step_index: 1, suggested: true },
    go_stopped: { route_id, steps_done_ratio: 0.5 },
    go_step_skipped: { route_id, step_index: 2, reason: 'signaled' },
    go_completed: { route_id, duration_actual_min: 95, steps_done_ratio: 1, closed_by: 'auto' },
    route_rated: { route_id, rating: 5, has_comment: false, source: 'go_end' },
  };
  const invalid: [AnalyticsEventName, unknown][] = [
    ['paywall_shown', { reason: 'plans_limit', source: 'route' }],
    ['paywall_shown', { reason: 'premium_route' }],
    ['profile_updated', { fields: [] }],
    ['profile_updated', { fields: ['email'] }],
    ['go_stopped', { route_id, steps_done_ratio: 1.5 }],
    ['go_step_skipped', { route_id, step_index: 2, reason: 'closed' }],
    ['go_completed', { route_id, duration_actual_min: 95, steps_done_ratio: 1 }],
    ['route_rated', { route_id, rating: 5, has_comment: false }],
    ['route_rated', { route_id, rating: 6, has_comment: false, source: 'past' }],
  ];

  it('accepts their properties', () => {
    for (const [name, properties] of Object.entries(valid)) {
      expect(checkAnalyticsEvent(name, properties), name).toMatchObject({ success: true });
    }
  });

  it.each(invalid)('refuses %s with %o', (name, properties) => {
    expect(checkAnalyticsEvent(name, properties).success).toBe(false);
  });

  it('are in the catalog', () => {
    expect(Object.keys(analyticsEvents)).toEqual(expect.arrayContaining(Object.keys(valid)));
  });
});

describe('events of the discovery (D-067)', () => {
  const route_id = 'route-1';
  const valid: [AnalyticsEventName, unknown][] = [
    ['result_card_viewed', { route_id, position: 0, section: 'nearby', sheet_level: 'rest' }],
    ['result_card_viewed', { route_id, position: 3, section: 'weather', sheet_level: 'full' }],
    [
      'result_card_viewed',
      { route_id, position: 12, section: 'nearby', sheet_level: 'list', sort: 'distance' },
    ],
    [
      'section_opened',
      { section: 'nearby', sheet_level: 'half', sort: 'recommended', results_count: 9 },
    ],
    [
      'section_opened',
      { section: 'weather', sheet_level: 'rest', sort: 'rating', results_count: 0 },
    ],
    ['list_sorted', { section: 'signature', sort: 'duration', previous_sort: 'recommended' }],
    ['route_opened', { route_id, source: 'marker', step_index: 0 }],
    ['route_opened', { route_id, source: 'marker', step_index: 2 }],
    ['filters_applied', { ...noFilters, results_count: 4, source: 'panel' }],
  ];
  const invalid: [string, AnalyticsEventName, unknown][] = [
    [
      'an unknown section',
      'section_opened',
      {
        section: 'popular',
        sheet_level: 'half',
        sort: 'recommended',
        results_count: 9,
      },
    ],
    [
      'the list as the detent of « Voir tout »',
      'section_opened',
      {
        section: 'nearby',
        sheet_level: 'list',
        sort: 'recommended',
        results_count: 9,
      },
    ],
    [
      'an unknown property',
      'section_opened',
      {
        section: 'nearby',
        sheet_level: 'half',
        sort: 'recommended',
        results_count: 9,
        zone: 'République',
      },
    ],
    [
      'a missing count',
      'section_opened',
      {
        section: 'nearby',
        sheet_level: 'half',
        sort: 'recommended',
      },
    ],
    [
      'an unknown sort',
      'list_sorted',
      { section: 'nearby', sort: 'price', previous_sort: 'rating' },
    ],
    [
      'the same sort',
      'list_sorted',
      { section: 'nearby', sort: 'rating', previous_sort: 'rating' },
    ],
    [
      'an unknown property',
      'list_sorted',
      {
        section: 'nearby',
        sort: 'rating',
        previous_sort: 'distance',
        position: { lat: 48.8566, lng: 2.3522 },
      },
    ],
    [
      'a card without its section',
      'result_card_viewed',
      { route_id, position: 0, sheet_level: 'rest' },
    ],
    [
      'a sort outside the list',
      'result_card_viewed',
      {
        route_id,
        position: 0,
        section: 'nearby',
        sheet_level: 'half',
        sort: 'rating',
      },
    ],
    [
      'a card of the list without its sort',
      'result_card_viewed',
      {
        route_id,
        position: 0,
        section: 'nearby',
        sheet_level: 'list',
      },
    ],
    [
      'an unknown property',
      'result_card_viewed',
      {
        route_id,
        position: 0,
        section: 'nearby',
        sheet_level: 'rest',
        zoom: 14,
      },
    ],
    ['a step from -1', 'route_opened', { route_id, source: 'marker', step_index: -1 }],
    ['an unknown property', 'route_opened', { route_id, source: 'marker', step_id: 'step-1' }],
    [
      'the weather source',
      'filters_applied',
      { ...noFilters, results_count: 4, source: 'weather' },
    ],
  ];

  it.each(valid)('accepts %s with %o', (name, properties) => {
    expect(checkAnalyticsEvent(name, properties)).toEqual({ success: true, properties });
  });

  it.each(invalid)('refuses %s in %s', (_, name, properties) => {
    expect(checkAnalyticsEvent(name, properties).success).toBe(false);
  });

  it('no longer has the events of the weather banner', () => {
    for (const name of ['weather_banner_shown', 'weather_banner_tapped']) {
      expect(checkAnalyticsEvent(name, { condition: 'rainy' })).toEqual({
        success: false,
        error: `Unknown analytics event: ${name}`,
      });
    }
  });

  it('sends the section keys of packages/shared', () => {
    expect(discoverySections).toEqual(['nearby', 'weather', 'signature']);
  });
});
