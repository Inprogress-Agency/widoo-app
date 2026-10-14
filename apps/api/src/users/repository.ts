import { FirstName, type UpdateMe } from '@widoo/shared';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import type { VerifiedIdentity } from '../auth/verifier';
import type { Db } from '../db/client';
import {
  devices,
  plannedRoutes,
  routeUnlocks,
  supportMessages,
  userAnecdotes,
  userFeaturedRoutes,
  users,
} from '../db/schema';
import { storedNotificationPrefs } from './notification-prefs';
import { profileIssues, replaceProfileLists, type ProfileIssue } from './profile';

export type User = typeof users.$inferSelect;

/**
 * First word of the provider's display name, when it is a valid first name: the API keeps the
 * first name only (data minimization), and the user can change it.
 */
export function firstNameOf(name: string | null): string | null {
  const parsed = FirstName.safeParse(name?.trim().split(/\s+/)[0]);
  return parsed.success ? parsed.data : null;
}

async function findActiveByFirebaseUid(db: Db, firebaseUid: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.firebaseUid, firebaseUid), isNull(users.deletedAt)));
  return user;
}

/**
 * True when an account of this identity was deleted at or after `authTime`: the token comes from
 * a session opened before the deletion, which never gets an account again. Only a new sign-in
 * does (D-027). Second precision of `auth_time`: a sign-in in the very second of the deletion is
 * refused too, and the app signs in again.
 */
async function deletedSince(db: Db, firebaseUid: string, authTime: Date): Promise<boolean> {
  const [deleted] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.firebaseUid, firebaseUid), gte(users.deletedAt, authTime)))
    .limit(1);
  return deleted !== undefined;
}

/** Outcome of `findOrCreateUser`: `signed_out` for a session opened before a deletion. */
export type SignedInUser = { kind: 'active'; user: User } | { kind: 'signed_out' };

/**
 * The active account of a Firebase identity, created on its first authenticated request with the
 * verified e-mail and the first name. A deleted account is never returned nor reopened: the same
 * identity, signed in again after the deletion, gets a new account (D-027). Concurrent first
 * requests insert once, the others read that row.
 */
export async function findOrCreateUser(db: Db, identity: VerifiedIdentity): Promise<SignedInUser> {
  const existing = await findActiveByFirebaseUid(db, identity.uid);
  if (existing) {
    return { kind: 'active', user: existing };
  }
  if (await deletedSince(db, identity.uid, identity.authTime)) {
    return { kind: 'signed_out' };
  }
  const [created] = await db
    .insert(users)
    .values({
      firebaseUid: identity.uid,
      email: identity.emailVerified ? identity.email : null,
      firstName: firstNameOf(identity.name),
    })
    .onConflictDoNothing({ target: users.firebaseUid, where: isNull(users.deletedAt) })
    .returning();
  const user = created ?? (await findActiveByFirebaseUid(db, identity.uid));
  if (!user) {
    throw new Error('User neither created nor found');
  }
  return { kind: 'active', user };
}

/** Outcome of `updateUser`: nothing is written unless it is `updated`. */
export type UserUpdate =
  | { kind: 'updated'; user: User }
  | { kind: 'invalid'; issues: ProfileIssue[] }
  | { kind: 'deleted' };

/**
 * Applies a profile update to an active account, in one transaction: account fields,
 * notification preferences merged into the stored ones by the database, then the anecdotes and
 * featured routes, each list replaced as a whole. The account row is locked first, so that two
 * saves of the same profile run one after the other. A broken rule writes nothing.
 */
export async function updateUser(db: Db, userId: string, update: UpdateMe): Promise<UserUpdate> {
  const { notificationPrefs, anecdotes, featuredRouteIds, ...fields } = update;
  return db.transaction(async (tx): Promise<UserUpdate> => {
    const active = and(eq(users.id, userId), isNull(users.deletedAt));
    const [locked] = await tx.select().from(users).where(active).for('update');
    if (!locked) return { kind: 'deleted' };

    const issues = await profileIssues(tx, userId, { anecdotes, featuredRouteIds });
    if (issues.length > 0) return { kind: 'invalid', issues };

    const set = {
      ...fields,
      ...(notificationPrefs && {
        notificationPrefs: sql`${users.notificationPrefs} || ${JSON.stringify(storedNotificationPrefs(notificationPrefs))}::jsonb`,
      }),
    };
    const [user] =
      Object.keys(set).length > 0
        ? await tx.update(users).set(set).where(active).returning()
        : [locked];
    if (!user) return { kind: 'deleted' };
    await replaceProfileLists(tx, userId, { anecdotes, featuredRouteIds });
    return { kind: 'updated', user };
  });
}

/**
 * Account deletion (wiki Compte-et-Monetisation): `deleted_at` set, e-mail, first name, avatar,
 * bio, neighborhood, language and preferences erased, anecdotes, featured routes, plannings,
 * phones (no push reaches a deleted account) and messages to the support deleted,
 * profile no longer public, so its routes show « Membre Widoo ». The row and its `firebase_uid`
 * stay until the purge, 30 days later (wiki Securite-et-RGPD), whose cascade finds nothing left
 * to delete.
 */
export async function softDeleteUser(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const deleted = await tx
      .update(users)
      .set({
        deletedAt: sql`now()`,
        email: null,
        firstName: null,
        avatarUrl: null,
        bio: null,
        neighborhood: null,
        isPublic: false,
        notificationPrefs: {},
        locale: null,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });
    if (deleted.length === 0) return;
    await tx.delete(userAnecdotes).where(eq(userAnecdotes.userId, userId));
    await tx.delete(userFeaturedRoutes).where(eq(userFeaturedRoutes.userId, userId));
    // Their progress rows go with them (cascade).
    await tx.delete(plannedRoutes).where(eq(plannedRoutes.userId, userId));
    // A route bought alone belongs to the account: nothing is left to unlock (D-073).
    await tx.delete(routeUnlocks).where(eq(routeUnlocks.userId, userId));
    await tx.delete(devices).where(eq(devices.userId, userId));
    // Their reply address and text are personal data of the account (D-063).
    await tx.delete(supportMessages).where(eq(supportMessages.userId, userId));
  });
}
