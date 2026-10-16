import { FirstName, onlineRouteStatuses, type UpdateMe } from '@widoo/shared';
import { and, eq, gte, inArray, isNull, ne, notInArray, or, sql } from 'drizzle-orm';
import type { VerifiedIdentity } from '../auth/verifier';
import type { Db, Tx } from '../db/client';
import {
  devices,
  media,
  notifications,
  plannedRoutes,
  routeReports,
  routeRevisions,
  routes,
  routeUnlocks,
  steps,
  supportMessages,
  userAnecdotes,
  userFeaturedRoutes,
  users,
} from '../db/schema';
import { eraseRatingsOf } from '../ratings/repository';
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
 * Account deletion (wiki Compte-et-Monetisation, D-025): `deleted_at` set, e-mail, first name,
 * avatar, bio, neighborhood, language, preferences and store identifier erased, profile no longer
 * public, and every row of the account deleted (`eraseAccountRows`). Its routes online stay,
 * signed « Membre Widoo »; the others go with their steps and photos (`deleteOfflineRoutes`).
 * The row and its `firebase_uid` stay until the purge, 30 days later (wiki Securite-et-RGPD), to
 * refuse the sessions opened before; a new sign-in of the identity gets a new account (D-027).
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
        revenuecatAppUserId: null,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });
    if (deleted.length === 0) return;
    await eraseAccountRows(tx, userId);
    await deleteOfflineRoutes(tx, userId);
  });
}

/** The rows that belong to the account alone: a new table of the account is added here. */
async function eraseAccountRows(tx: Tx, userId: string): Promise<void> {
  await tx.delete(userAnecdotes).where(eq(userAnecdotes.userId, userId));
  await tx.delete(userFeaturedRoutes).where(eq(userFeaturedRoutes.userId, userId));
  // Their progress rows go with them (cascade).
  await tx.delete(plannedRoutes).where(eq(plannedRoutes.userId, userId));
  // A route bought alone belongs to the account: nothing is left to unlock (D-073).
  await tx.delete(routeUnlocks).where(eq(routeUnlocks.userId, userId));
  await tx.delete(devices).where(eq(devices.userId, userId));
  // Their reply address and text are personal data of the account (D-063).
  await tx.delete(supportMessages).where(eq(supportMessages.userId, userId));
  // Its reports of routes, open or decided (D-056); a `low_rating` report has no reporter.
  await tx.delete(routeReports).where(eq(routeReports.userId, userId));
  // Its ratings and reviews leave the routes they counted in, recomputed (D-029).
  await eraseRatingsOf(tx, userId);
  await tx.delete(notifications).where(eq(notifications.userId, userId));
}

/**
 * Drafts, private routes and every route of the author not online (`onlineRouteStatuses`), with
 * their steps, revisions (cascade) and photos (`media` has no foreign key), and the unfinished or
 * refused revisions of the routes kept, with the photos of the steps they alone hold. The
 * plannings of other users keep their snapshot (`planned_routes.route_id` set null).
 */
async function deleteOfflineRoutes(tx: Tx, userId: string): Promise<void> {
  const ofAuthor = eq(routes.authorId, userId);
  const offline = await tx
    .select({ id: routes.id })
    .from(routes)
    .where(and(ofAuthor, notInArray(routes.status, [...onlineRouteStatuses])));
  const offlineIds = offline.map((route) => route.id);
  const offlineSteps =
    offlineIds.length === 0
      ? []
      : await tx.select({ id: steps.id }).from(steps).where(inArray(steps.routeId, offlineIds));

  const droppedRevisions = and(
    eq(routeRevisions.authorId, userId),
    ne(routeRevisions.status, 'published'),
  );
  // Steps added in a revision exist in its snapshot only, not in `steps`.
  const revisionSteps = await tx.execute<{ id: string }>(sql`
    select distinct step->>'id' as id
    from ${routeRevisions}, jsonb_array_elements(${routeRevisions.snapshot}->'steps') as step
    where ${droppedRevisions}
      and not exists (select 1 from ${steps} where ${steps.id}::text = step->>'id')`);

  const stepIds = [...offlineSteps.map((step) => step.id), ...revisionSteps.map((step) => step.id)];
  const photos = [
    ...(offlineIds.length > 0
      ? [and(eq(media.ownerType, 'route'), inArray(media.ownerId, offlineIds))]
      : []),
    ...(stepIds.length > 0
      ? [and(eq(media.ownerType, 'step'), inArray(media.ownerId, stepIds))]
      : []),
  ];
  if (photos.length > 0) await tx.delete(media).where(or(...photos));
  await tx.delete(routeRevisions).where(droppedRevisions);
  if (offlineIds.length > 0) await tx.delete(routes).where(inArray(routes.id, offlineIds));
}
