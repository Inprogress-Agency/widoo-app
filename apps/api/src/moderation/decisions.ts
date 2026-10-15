import type {
  AlreadyDecidedDetails,
  ModerationAction,
  ModerationDecision,
  RejectionReason,
  RouteStatus,
} from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import type { Db } from '../db/client';
import { moderationActionsTable, routes } from '../db/schema';
import { httpError } from '../errors';

type DecidableAction = Exclude<ModerationAction, 'edit'>;

/** What each decision asks of the route, and the status it gives it (wiki, cycle de vie). */
const transitions: Record<DecidableAction, { from: readonly RouteStatus[]; to: RouteStatus }> = {
  publish: { from: ['pending'], to: 'published' },
  // A route waiting for its first look goes back to its author; one already online stays online
  // and is marked « à corriger » (a low rating or a report, A-03): see `statusAfter`.
  request_changes: { from: ['pending', 'published'], to: 'changes_requested' },
  reject: { from: ['pending'], to: 'rejected' },
  unpublish: { from: ['published', 'needs_fix'], to: 'unpublished' },
};

export type ModerationDecisionInput = {
  routeId: string;
  /** The member of the team who decides. */
  actorId: string;
  action: DecidableAction;
  reasonCode?: RejectionReason;
  /** Message to the author, required for everything but a publication. */
  message?: string;
};

/**
 * Applies a decision to a route: its new status, a row in its moderation history and a row in
 * the journal of the admin, all in one transaction. The route is locked while the decision is
 * made: when two members of the team decide at once, the second one finds a route that no longer
 * waits and receives 409 `already_decided` with the status the first one gave it.
 */
export async function decideRoute(
  db: Db,
  input: ModerationDecisionInput,
  now = new Date(),
): Promise<ModerationDecision> {
  const { from } = transitions[input.action];

  return db.transaction(async (tx) => {
    const [route] = await tx
      .select({ status: routes.status })
      .from(routes)
      .where(eq(routes.id, input.routeId))
      .for('update');
    if (!route) {
      throw httpError(404, 'Route not found');
    }
    if (!from.includes(route.status)) {
      const details: AlreadyDecidedDetails = { status: route.status };
      throw httpError(409, 'Route already decided', 'already_decided', details);
    }
    const to: RouteStatus =
      input.action === 'request_changes' && route.status === 'published'
        ? 'needs_fix'
        : transitions[input.action].to;

    await tx
      .update(routes)
      .set({ status: to, ...(to === 'published' ? { publishedAt: now } : {}) })
      .where(eq(routes.id, input.routeId));
    await tx.insert(moderationActionsTable).values({
      routeId: input.routeId,
      actorId: input.actorId,
      action: input.action,
      reasonCode: input.reasonCode ?? null,
      message: input.message ?? null,
    });
    await recordAdminAction(tx, {
      actorId: input.actorId,
      action: `route.${input.action}`,
      targetType: 'route',
      targetId: input.routeId,
      before: { status: route.status },
      after: { status: to },
      reason: [input.reasonCode, input.message].filter(Boolean).join(' — ') || undefined,
    });

    return { routeId: input.routeId, action: input.action, status: to };
  });
}
