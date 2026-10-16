import {
  allowedUserActions,
  type AdminUserDetail,
  type CertificationBody,
  type GiftBody,
  type UserAction,
  type UserRole,
} from '@widoo/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { routeUnlocks, routes, users } from '../db/schema';
import { httpError } from '../errors';
import { softDeleteUser } from '../users/repository';
import { recordAdminAction } from './actions';
import { readUserDetail } from './users-read';

/** The member of the team who acts: the role comes from the database, read by the guard. */
export type Actor = { id: string; role: UserRole };

type Target = typeof users.$inferSelect;

/**
 * Locks the account the action targets and checks the actor may do `action` to it (the rule of
 * `allowedUserActions`). 404 for an account that does not exist or was deleted; 403 otherwise.
 */
async function lockTarget(
  tx: Tx,
  actor: Actor,
  targetId: string,
  action: UserAction,
): Promise<Target> {
  const [target] = await tx
    .select()
    .from(users)
    .where(and(eq(users.id, targetId), isNull(users.deletedAt)))
    .for('update');
  if (!target) {
    throw httpError(404, 'User not found');
  }
  if (!allowedUserActions(actor, target).includes(action)) {
    throw httpError(403, 'Insufficient role');
  }
  return target;
}

async function detailOf(db: Db, userId: string): Promise<AdminUserDetail> {
  const detail = await readUserDetail(db, userId);
  if (!detail) {
    throw httpError(404, 'User not found');
  }
  return detail;
}

/** Changes the role of an account (admin only, never one's own). */
export async function changeUserRole(
  db: Db,
  actor: Actor,
  targetId: string,
  role: UserRole,
): Promise<AdminUserDetail> {
  await db.transaction(async (tx) => {
    const target = await lockTarget(tx, actor, targetId, 'role');
    if (target.role === role) {
      return;
    }
    await tx.update(users).set({ role }).where(eq(users.id, targetId));
    await recordAdminAction(tx, {
      actorId: actor.id,
      action: 'user.change_role',
      targetType: 'user',
      targetId,
      before: { role: target.role },
      after: { role },
    });
  });
  return detailOf(db, targetId);
}

/**
 * Suspends an account: refused everywhere (403 `account_suspended`), its public profile hidden,
 * its published routes kept. A suspended account answers 409.
 */
export async function suspendUser(
  db: Db,
  actor: Actor,
  targetId: string,
  reason: string,
  now = new Date(),
): Promise<AdminUserDetail> {
  await db.transaction(async (tx) => {
    const target = await lockTarget(tx, actor, targetId, 'suspend');
    if (target.suspendedAt) {
      throw httpError(409, 'Account already suspended', 'conflict', {
        reason: 'already_suspended',
      });
    }
    await tx
      .update(users)
      .set({ suspendedAt: now, suspensionReason: reason })
      .where(eq(users.id, targetId));
    await recordAdminAction(tx, {
      actorId: actor.id,
      action: 'user.suspend',
      targetType: 'user',
      targetId,
      before: { suspended: false },
      after: { suspended: true },
      reason,
    });
  });
  return detailOf(db, targetId);
}

/** Lifts a suspension. An account that is not suspended answers 409. */
export async function reactivateUser(
  db: Db,
  actor: Actor,
  targetId: string,
  reason: string,
): Promise<AdminUserDetail> {
  await db.transaction(async (tx) => {
    const target = await lockTarget(tx, actor, targetId, 'suspend');
    if (!target.suspendedAt) {
      throw httpError(409, 'Account is not suspended', 'conflict', { reason: 'not_suspended' });
    }
    await tx
      .update(users)
      .set({ suspendedAt: null, suspensionReason: null })
      .where(eq(users.id, targetId));
    await recordAdminAction(tx, {
      actorId: actor.id,
      action: 'user.reactivate',
      targetType: 'user',
      targetId,
      before: { suspended: true, suspensionReason: target.suspensionReason },
      after: { suspended: false },
      reason,
    });
  });
  return detailOf(db, targetId);
}

/** True while the right to Premium of an account comes from the store and has not ended. */
const hasActiveStorePremium = (target: Target, now: Date) =>
  target.plan === 'premium' &&
  target.planSource === 'store' &&
  (target.planExpiresAt === null || target.planExpiresAt.getTime() > now.getTime());

/**
 * Offers Premium until a date, or one Premium route (support, `source = gift`, without the
 * store). An account whose store plan runs keeps it: the gift would shorten what it paid for (409).
 * Past the date, the plan ends by itself (`canAccessRoute`).
 */
export async function giftUser(
  db: Db,
  actor: Actor,
  targetId: string,
  gift: GiftBody,
  now = new Date(),
): Promise<AdminUserDetail> {
  await db.transaction(async (tx) => {
    const target = await lockTarget(tx, actor, targetId, 'gift');
    if (gift.until !== undefined) {
      const until = new Date(gift.until);
      if (until.getTime() <= now.getTime()) {
        throw httpError(400, 'The end date must be in the future');
      }
      if (hasActiveStorePremium(target, now)) {
        throw httpError(409, 'The account has a running subscription or pass', 'conflict', {
          reason: 'active_store_plan',
        });
      }
      await tx
        .update(users)
        .set({ plan: 'premium', planSource: 'gift', planExpiresAt: until })
        .where(eq(users.id, targetId));
      await recordAdminAction(tx, {
        actorId: actor.id,
        action: 'user.gift_premium',
        targetType: 'user',
        targetId,
        before: { plan: target.plan, source: target.planSource, expiresAt: target.planExpiresAt },
        after: { plan: 'premium', source: 'gift', expiresAt: until },
      });
      return;
    }
    const routeId = gift.routeId;
    if (routeId === undefined) {
      throw httpError(400, 'Give exactly one of until and routeId');
    }
    const [route] = await tx
      .select({ access: routes.access, status: routes.status, authorId: routes.authorId })
      .from(routes)
      .where(eq(routes.id, routeId));
    if (!route || route.status !== 'published') {
      throw httpError(404, 'Route not found');
    }
    if (route.authorId === targetId) {
      throw httpError(409, 'A creator already has their own routes', 'conflict', {
        reason: 'own_route',
      });
    }
    if (route.access !== 'premium') {
      throw httpError(409, 'The route is free', 'conflict', { reason: 'free_route' });
    }
    const [inserted] = await tx
      .insert(routeUnlocks)
      .values({ userId: targetId, routeId, source: 'gift', storeTransactionId: null })
      .onConflictDoNothing()
      .returning({ routeId: routeUnlocks.routeId });
    if (!inserted) {
      throw httpError(409, 'The route is already unlocked', 'conflict', {
        reason: 'route_already_unlocked',
      });
    }
    await recordAdminAction(tx, {
      actorId: actor.id,
      action: 'user.gift_route',
      targetType: 'user',
      targetId,
      after: { routeId },
    });
  });
  return detailOf(db, targetId);
}

/** Awards or removes the Créateur certifié badge; the choice wins over the nightly computation. */
export async function setCertification(
  db: Db,
  actor: Actor,
  targetId: string,
  body: CertificationBody,
  now = new Date(),
): Promise<AdminUserDetail> {
  await db.transaction(async (tx) => {
    const target = await lockTarget(tx, actor, targetId, 'certification');
    if (target.certifiedOverride === body.override) {
      return;
    }
    await tx
      .update(users)
      .set({
        certifiedOverride: body.override,
        certifiedAt: body.override === 'granted' ? (target.certifiedAt ?? now) : target.certifiedAt,
      })
      .where(eq(users.id, targetId));
    await recordAdminAction(tx, {
      actorId: actor.id,
      action: 'user.certification',
      targetType: 'user',
      targetId,
      before: { override: target.certifiedOverride },
      after: { override: body.override },
    });
  });
  return detailOf(db, targetId);
}

/**
 * Deletes an account with the rule of the app (`softDeleteUser`, D-025, D-027): data erased now,
 * routes online kept as « Membre Widoo », the others deleted. An account of the team is demoted to
 * `user` first.
 */
export async function deleteUser(db: Db, actor: Actor, targetId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const target = await lockTarget(tx, actor, targetId, 'delete');
    await softDeleteUser(tx, targetId);
    await recordAdminAction(tx, {
      actorId: actor.id,
      action: 'user.delete',
      targetType: 'user',
      targetId,
      before: { role: target.role, plan: target.plan },
    });
  });
}

/** Refuses an export to whoever may not make it, before any data is read. */
export async function assertCanExport(db: Db, actor: Actor, targetId: string): Promise<void> {
  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, targetId), isNull(users.deletedAt)));
  if (!target) {
    throw httpError(404, 'User not found');
  }
  if (!allowedUserActions(actor, target).includes('export')) {
    throw httpError(403, 'Insufficient role');
  }
}
