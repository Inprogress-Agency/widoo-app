import type { Db } from '../db/client';
import { adminActions } from '../db/schema';

/** A write made from the admin, as the journal keeps it (A-12). */
export type AdminActionEntry = {
  /** The member of the team who acts. */
  actorId: string;
  /** Stable name of the action: `route.publish`, `place.close`, `user.suspend`... */
  action: string;
  targetType: string;
  targetId: string;
  /** State of the target before and after, limited to what the action changes. */
  before?: unknown;
  after?: unknown;
  /** Why, when the action asks for a reason. */
  reason?: string;
};

/**
 * Writes one row of the journal. Every write route of `/admin/*` calls it in the transaction of
 * its own change (`db.transaction((tx) => ...)`, then `recordAdminAction(tx, ...)`): the change
 * and its trace are saved together, or neither is.
 */
export async function recordAdminAction(
  db: Pick<Db, 'insert'>,
  entry: AdminActionEntry,
): Promise<void> {
  await db.insert(adminActions).values({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  });
}
