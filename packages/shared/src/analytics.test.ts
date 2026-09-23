import { describe, expectTypeOf, it } from 'vitest';
import type { AnalyticsEventArgs, AnalyticsEventName } from './analytics';

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
  });
});
