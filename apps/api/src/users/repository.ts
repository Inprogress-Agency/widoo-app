import { FirstName, type UpdateMe } from '@widoo/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { VerifiedIdentity } from '../auth/verifier';
import type { Db } from '../db/client';
import { users } from '../db/schema';

export type User = typeof users.$inferSelect;

/**
 * First word of the provider's display name, when it is a valid first name: the API keeps the
 * first name only (data minimization), and the user can change it.
 */
export function firstNameOf(name: string | null): string | null {
  const parsed = FirstName.safeParse(name?.trim().split(/\s+/)[0]);
  return parsed.success ? parsed.data : null;
}

async function findByFirebaseUid(db: Db, firebaseUid: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
  return user;
}

/**
 * The account of a Firebase identity, created on its first authenticated request with the
 * verified e-mail and the first name. Deleted accounts are returned as well: refusing them is the
 * caller's decision. Concurrent first requests insert once, the others read that row.
 */
export async function findOrCreateUser(db: Db, identity: VerifiedIdentity): Promise<User> {
  const existing = await findByFirebaseUid(db, identity.uid);
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(users)
    .values({
      firebaseUid: identity.uid,
      email: identity.emailVerified ? identity.email : null,
      firstName: firstNameOf(identity.name),
    })
    .onConflictDoNothing({ target: users.firebaseUid })
    .returning();
  const user = created ?? (await findByFirebaseUid(db, identity.uid));
  if (!user) {
    throw new Error('User neither created nor found');
  }
  return user;
}

/**
 * Applies a profile update to an active account; notification preferences are merged into the
 * stored ones by the database. Undefined when the account is deleted meanwhile.
 */
export async function updateUser(
  db: Db,
  userId: string,
  update: UpdateMe,
): Promise<User | undefined> {
  const { notificationPrefs, ...fields } = update;
  const [updated] = await db
    .update(users)
    .set({
      ...fields,
      ...(notificationPrefs && {
        notificationPrefs: sql`${users.notificationPrefs} || ${JSON.stringify(notificationPrefs)}::jsonb`,
      }),
    })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();
  return updated;
}

/**
 * Account deletion (wiki Compte-et-Monetisation): `deleted_at` set, e-mail, first name, avatar,
 * bio and preferences erased, profile no longer public, so its routes show « Membre Widoo ».
 * The row and its `firebase_uid` stay until the purge, 30 days later (wiki Securite-et-RGPD).
 */
export async function softDeleteUser(db: Db, userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      deletedAt: sql`now()`,
      email: null,
      firstName: null,
      avatarUrl: null,
      bio: null,
      isPublic: false,
      notificationPrefs: {},
    })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
}
