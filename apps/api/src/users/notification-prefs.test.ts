import { defaultNotificationPrefs } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { readNotificationPrefs, storedNotificationPrefs } from './notification-prefs';

describe('readNotificationPrefs', () => {
  it('reads the snake_case keys of the column', () => {
    expect(readNotificationPrefs({ reminders: false, next_day: false, my_routes: true })).toEqual({
      reminders: false,
      nextDay: false,
      myRoutes: true,
    });
  });

  it('defaults to true every key never set', () => {
    expect(readNotificationPrefs({})).toEqual(defaultNotificationPrefs);
    expect(readNotificationPrefs({ next_day: false })).toEqual({
      ...defaultNotificationPrefs,
      nextDay: false,
    });
  });

  it('ignores the provisional keys of #385 and values that are not booleans', () => {
    const stored = { plannedRouteReminders: false, creatorPush: false, reminders: 'no' };
    expect(readNotificationPrefs(stored)).toEqual(defaultNotificationPrefs);
  });

  it.each([null, 'true', [false], 3])('defaults everything for a column holding %j', (stored) => {
    expect(readNotificationPrefs(stored)).toEqual(defaultNotificationPrefs);
  });
});

describe('storedNotificationPrefs', () => {
  it('writes the keys of the update only, in snake_case', () => {
    expect(storedNotificationPrefs({ nextDay: false, myRoutes: true })).toEqual({
      next_day: false,
      my_routes: true,
    });
    expect(storedNotificationPrefs({})).toEqual({});
  });

  it('reads back what it writes', () => {
    const prefs = { reminders: false, nextDay: true, myRoutes: false };
    expect(readNotificationPrefs(storedNotificationPrefs(prefs))).toEqual(prefs);
  });
});
