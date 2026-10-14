/**
 * Anti-spam limit of the submission (wiki Compte-et-Monetisation › Freemium, D-073): an account
 * has at most `max_pending_routes` routes awaiting moderation at once, a published route whose
 * revision awaits it counting as one. Creation has no limit.
 */
import { canSubmitRoute, maxPendingRoutesKey, maxPendingRoutesOf } from '@widoo/shared';
import { and, count, eq, ne } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { routeRevisions, routes, users } from '../db/schema';
import { pendingRoutesLimitReached } from '../errors';
import { readSetting } from '../search/settings';

/**
 * Throws 429 `rate_limited` when the author already has the maximum of other routes awaiting
 * moderation. Runs in the transaction that moves `routeId` to `pending` (`POST /routes/:id/submit`,
 * #48), before it: the author's row is locked, so two submissions at once cannot both take the
 * last place. The limit is read on each call, so that a change of `settings` applies at once.
 */
export async function assertPendingRoom(tx: Tx, authorId: string, routeId: string): Promise<void> {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, authorId)).for('no key update');
  const limit = maxPendingRoutesOf(await readSetting(tx, maxPendingRoutesKey));
  const [pending] = await tx
    .select({ count: count() })
    .from(routes)
    .where(
      and(eq(routes.authorId, authorId), eq(routes.status, 'pending'), ne(routes.id, routeId)),
    );
  const [pendingRevisions] = await tx
    .select({ count: count() })
    .from(routeRevisions)
    .innerJoin(routes, eq(routes.id, routeRevisions.routeId))
    .where(
      and(
        eq(routes.authorId, authorId),
        eq(routeRevisions.status, 'pending'),
        ne(routes.id, routeId),
      ),
    );
  const others = (pending?.count ?? 0) + (pendingRevisions?.count ?? 0);
  if (!canSubmitRoute(others, limit)) {
    throw pendingRoutesLimitReached(limit);
  }
}
