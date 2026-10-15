import { effectiveLocale, type AppLocale, type NotificationPref } from '@widoo/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { devices, users } from '../db/schema';
import { lastDeviceLocale } from '../users/devices';
import { readNotificationPrefs } from '../users/notification-prefs';

/** Where and in which language a push goes: every phone of the account, in one language. */
export interface PushRecipient {
  locale: AppLocale;
  /** The phones of the account, the most recently registered first. */
  pushTokens: string[];
}

/** Where and in which language an e-mail of the account goes. */
export interface EmailRecipient {
  email: string;
  locale: AppLocale;
}

const activeUser = (userId: string) => and(eq(users.id, userId), isNull(users.deletedAt));

/**
 * The recipient of a push that `pref` can silence (D-062), read at the time of sending: the phones
 * of an active account whose switch is on, in its effective language (its choice, else its last
 * phone, else French). Null when nothing is to be sent: account deleted or unknown, switch off,
 * or no phone registered. The only door of the push senders (#44) to the preferences and the
 * language.
 */
export async function pushRecipientOf(
  db: Db,
  userId: string,
  pref: NotificationPref,
): Promise<PushRecipient | null> {
  const [user] = await db
    .select({ locale: users.locale, notificationPrefs: users.notificationPrefs })
    .from(users)
    .where(activeUser(userId));
  if (!user || !readNotificationPrefs(user.notificationPrefs)[pref]) return null;

  const phones = await db
    .select({ pushToken: devices.pushToken, locale: devices.locale })
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.updatedAt), desc(devices.id));
  const [last] = phones;
  if (!last) return null;
  return {
    locale: effectiveLocale(user.locale, last.locale),
    pushTokens: phones.map((phone) => phone.pushToken),
  };
}

/**
 * The recipient of an e-mail about the account (D-062, D-069), in its effective language: its
 * address and its choice, else its last phone, else French. Null for a deleted or unknown account,
 * or one without address (Sign in with Apple may hide it). No switch silences these e-mails. The
 * confirmation of a new address goes to that address, in the language of `localeOfUser`; the
 * sign-in link and the replies of the support, which may have no account, take the language of
 * the request (`language` of `POST /auth/email-link`, `support_messages.locale`).
 */
export async function emailRecipientOf(db: Db, userId: string): Promise<EmailRecipient | null> {
  const [user] = await db
    .select({ email: users.email, locale: users.locale })
    .from(users)
    .where(activeUser(userId));
  if (!user?.email) return null;

  const locale = effectiveLocale(user.locale, await lastDeviceLocale(db, userId));
  return { email: user.email, locale };
}
