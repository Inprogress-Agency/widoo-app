/**
 * Submission and author status of a route (wiki API › Création, E-14), each in one transaction:
 * the checks, the moves of `moveRoute` and the revision of a published route.
 */
import {
  hasRole,
  openRevisionStatuses,
  submissionOf,
  type AuthorStatusTarget,
  type OwnRoute,
} from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { routeRevisions } from '../db/schema';
import { coherenceBlocked, conflict } from '../errors';
import { assertPendingRoom } from '../moderation/pending-limit';
import type { User } from '../users/repository';
import { moveRoute } from './lifecycle';
import { writeInPlace } from './save';
import { evaluationOf, ownedRoute, ownRouteOf, workspaceOf } from './workspace';

/**
 * `POST /routes/:id/submit`. 409 `conflict` for a status that cannot be submitted, or a
 * published route without a revision to submit; 422 `coherence_blocked` with the blocking rules;
 * 429 `rate_limited` over the routes awaiting moderation (D-073). An `editor` publishes at once,
 * still under the blocking rules, outside the limit; a published route stays online while its
 * revision awaits moderation.
 */
export async function submitRoute(
  db: Db,
  user: Pick<User, 'id' | 'role'>,
  routeId: string,
  now: Date,
): Promise<OwnRoute> {
  return db.transaction(async (tx) => {
    const route = await ownedRoute(tx, user.id, routeId);
    const actor = hasRole(user.role, 'editor') ? 'editor' : 'author';
    const outcome = submissionOf(route.status, actor);
    if (outcome === null) {
      throw conflict(`A ${route.status} route cannot be submitted`, { status: route.status });
    }
    const workspace = await workspaceOf(tx, route);
    const assertSubmittable = async () => {
      const { errors } = await evaluationOf(tx, workspace, now);
      if (errors.length > 0) throw coherenceBlocked(errors);
      if (actor === 'author') await assertPendingRoom(tx, user.id, route.id);
    };

    if (outcome !== 'revision') {
      await assertSubmittable();
      const moved = await moveRoute(tx, route, outcome, actor, now);
      return ownRouteOf(tx, { ...workspace, route: moved }, now);
    }
    const { revision } = workspace;
    if (!revision) {
      throw conflict('The published route has no change to submit', { status: route.status });
    }
    if (revision.status === 'pending') {
      throw conflict('The revision awaits moderation', { revisionStatus: revision.status });
    }
    await assertSubmittable();
    if (actor === 'editor') {
      const published = await writeInPlace(tx, route, revision.content, now);
      await tx
        .update(routeRevisions)
        .set({ status: 'published', submittedAt: now, decidedAt: now })
        .where(eq(routeRevisions.id, revision.id));
      return ownRouteOf(tx, { route: published, revision: null, content: revision.content }, now);
    }
    await tx
      .update(routeRevisions)
      .set({ status: 'pending', submittedAt: now })
      .where(eq(routeRevisions.id, revision.id));
    return ownRouteOf(tx, { ...workspace, revision: { ...revision, status: 'pending' } }, now);
  });
}

/**
 * `POST /routes/:id/status`: save as private, take a refused route back as a draft, or withdraw
 * a published one, whose open revision is dropped with it (a withdrawn route is not edited).
 */
export async function changeRouteStatus(
  db: Db,
  userId: string,
  routeId: string,
  to: AuthorStatusTarget,
  now: Date,
): Promise<OwnRoute> {
  return db.transaction(async (tx) => {
    const moved = await moveRoute(tx, await ownedRoute(tx, userId, routeId), to, 'author', now);
    if (to === 'unpublished') {
      await tx
        .delete(routeRevisions)
        .where(
          and(
            eq(routeRevisions.routeId, routeId),
            inArray(routeRevisions.status, [...openRevisionStatuses]),
          ),
        );
    }
    return ownRouteOf(tx, await workspaceOf(tx, moved), now);
  });
}
