import { describe, expect, it } from 'vitest';
import { defaultNotificationPrefs, notificationKinds, notificationPrefOfKind } from '.';

describe('notificationPrefOfKind', () => {
  it('silences each kind by one switch of Réglages › Notifications', () => {
    for (const kind of notificationKinds) {
      expect(Object.keys(defaultNotificationPrefs)).toContain(notificationPrefOfKind[kind]);
    }
  });

  it('ties the 10:00 notification to nextDay and the thanks for a report to myRoutes', () => {
    expect(notificationPrefOfKind).toEqual({ go_closed: 'nextDay', report_resolved: 'myRoutes' });
  });
});
