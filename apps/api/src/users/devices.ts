import { effectiveLocale, type AppLocale, type RegisterDevice } from '@widoo/shared';
import { and, desc, eq, isNull, notInArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { devices, users } from '../db/schema';

/**
 * Phones kept per account, the most recently registered: enough for a phone and a tablet changed
 * a few times, and a bound on what one account can store.
 */
export const devicesPerUserMax = 10;

/**
 * Registers the push token of a phone and its language for an active account (`POST /me/devices`).
 * A token is one phone: registered again, it moves to the account signed in now, which stops the
 * push of the previous one on that phone. Only the `devicesPerUserMax` most recent phones of the
 * account are kept. False when the account is deleted, and nothing is written.
 */
export async function registerDevice(
  db: Db,
  userId: string,
  { pushToken, locale }: RegisterDevice,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const active = and(eq(users.id, userId), isNull(users.deletedAt));
    const [locked] = await tx.select({ id: users.id }).from(users).where(active).for('update');
    if (!locked) return false;

    await tx
      .insert(devices)
      .values({ userId, pushToken, locale })
      .onConflictDoUpdate({
        target: devices.pushToken,
        set: { userId, locale, updatedAt: sql`now()` },
      });
    const kept = tx
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.updatedAt), desc(devices.id))
      .limit(devicesPerUserMax);
    await tx.delete(devices).where(and(eq(devices.userId, userId), notInArray(devices.id, kept)));
    return true;
  });
}

/** Language of the phone the account registered last, null without any. */
async function lastDeviceLocale(db: Db, userId: string): Promise<AppLocale | null> {
  const [last] = await db
    .select({ locale: devices.locale })
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.updatedAt), desc(devices.id))
    .limit(1);
  return last?.locale ?? null;
}

/**
 * Language of the push and e-mails of an account (D-062): its choice, else its last phone, else
 * French. Null for an account that does not exist or is deleted, which receives nothing.
 */
export async function localeOfUser(db: Db, userId: string): Promise<AppLocale | null> {
  const [user] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!user) return null;
  return effectiveLocale(user.locale, await lastDeviceLocale(db, userId));
}
