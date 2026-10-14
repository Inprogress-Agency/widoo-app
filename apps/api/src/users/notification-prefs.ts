import { defaultNotificationPrefs, type NotificationPrefs } from '@widoo/shared';

type PrefKey = keyof NotificationPrefs;

/** Key of `users.notification_prefs` (wiki Modele-de-Donnees, D-062) for each key of the API. */
const storedKeyOf = {
  reminders: 'reminders',
  nextDay: 'next_day',
  myRoutes: 'my_routes',
} as const satisfies Record<PrefKey, string>;

const prefKeys = Object.keys(storedKeyOf) as PrefKey[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The preferences of an account from its stored column: a key that is missing or not a boolean
 * is `true`, the default. Keys the API does not know, such as the provisional ones of #385, are
 * ignored.
 */
export function readNotificationPrefs(stored: unknown): NotificationPrefs {
  const prefs = { ...defaultNotificationPrefs };
  if (!isRecord(stored)) return prefs;
  for (const key of prefKeys) {
    const value = stored[storedKeyOf[key]];
    if (typeof value === 'boolean') prefs[key] = value;
  }
  return prefs;
}

/** The stored form of a partial update, to merge into the column (`||` of jsonb). */
export function storedNotificationPrefs(
  update: Partial<NotificationPrefs>,
): Record<string, boolean> {
  const stored: Record<string, boolean> = {};
  for (const key of prefKeys) {
    const value = update[key];
    if (value !== undefined) stored[storedKeyOf[key]] = value;
  }
  return stored;
}
