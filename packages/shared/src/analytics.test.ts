import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AnalyticsCommonProperties,
  analyticsEvents,
  checkAnalyticsEvent,
  type AnalyticsEventArgs,
  type AnalyticsEventName,
} from './analytics';

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
