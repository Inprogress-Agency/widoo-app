import type { NotificationKind } from './reports';
import type { AppLocale, NotificationPrefs } from './schemas/me';

/** A switch of Réglages › Notifications (E-19, D-062), as the API names it. */
export type NotificationPref = keyof NotificationPrefs;

/**
 * The switch that silences each kind of `notifications` (D-062): `go_closed`, the 10:00
 * notification after a Go, follows `nextDay`; `report_resolved`, the thanks for a report, follows
 * `myRoutes`. The reminders of a planned route follow `reminders`, and the e-mails of the account
 * (sign-in link, change of address) follow none: they answer a request of the user.
 */
export const notificationPrefOfKind = {
  go_closed: 'nextDay',
  report_resolved: 'myRoutes',
} as const satisfies Record<NotificationKind, NotificationPref>;

/**
 * A text the server sends (push, e-mail), written in every language of the app (D-062): a
 * template that misses English does not compile. The sender takes `texts[locale]`, the locale of
 * the recipient.
 */
export type Localized<T> = Readonly<Record<AppLocale, T>>;
