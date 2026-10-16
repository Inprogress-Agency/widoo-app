import {
  allowedUserActions,
  type AdminUserDetail,
  type UserAction,
  type UserRole,
} from '@widoo/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { users } from '../db/schema';
import { httpError } from '../errors';
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
