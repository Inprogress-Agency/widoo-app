import {
  adminActionsPageSize,
  type AdminActionFilters,
  type AdminActionPeriod,
  type AdminActions,
  type AdminActionsQuery,
} from '@widoo/shared';
import { and, asc, desc, eq, gte, inArray, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client';
import { adminActions, places, routes, users } from '../db/schema';
import { neighbourCursors, offsetOfCursor } from './page-cursor';

const periodMs: Record<AdminActionPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/** The name a journal line gives an author: first name, else e-mail; null once purged. */
const nameOf = (user: { firstName: string | null; email: string | null }) =>
  user.firstName ?? user.email;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TargetRow = { targetType: string; targetId: string };

/**
 * What the targets of a page are called today, by `type:id`: accounts, routes and places, three
 * queries at most for the whole page. A deleted account has no name left, so it has no label.
 */
async function targetLabelsOf(db: Db, rows: TargetRow[]): Promise<Map<string, string>> {
  const idsOf = (type: string) => [
    ...new Set(
      rows
        .filter((row) => row.targetType === type && uuidPattern.test(row.targetId))
        .map((row) => row.targetId),
    ),
  ];
  const [userIds, routeIds, placeIds] = [idsOf('user'), idsOf('route'), idsOf('place')];
  const [userRows, routeRows, placeRows] = await Promise.all([
    userIds.length
      ? db
          .select({ id: users.id, firstName: users.firstName, email: users.email })
          .from(users)
          .where(inArray(users.id, userIds))
      : [],
    routeIds.length
      ? db
          .select({ id: routes.id, name: routes.title })
          .from(routes)
          .where(inArray(routes.id, routeIds))
      : [],
    placeIds.length
      ? db
          .select({ id: places.id, name: places.name })
          .from(places)
          .where(inArray(places.id, placeIds))
      : [],
  ]);
  const labels = new Map<string, string>();
  for (const row of userRows) {
    const name = row.firstName ?? row.email;
    if (name) labels.set(`user:${row.id}`, name);
  }
  for (const row of routeRows) labels.set(`route:${row.id}`, row.name);
  for (const row of placeRows) labels.set(`place:${row.id}`, row.name);
  return labels;
}

/**
 * A page of the journal of the admin (A-12), most recent first, narrowed by the filters. Read
 * only: nothing in the journal is ever changed or deleted.
 */
export async function readAdminActions(
  db: Db,
  query: AdminActionsQuery,
  now = new Date(),
): Promise<AdminActions> {
  const offset = offsetOfCursor(query.cursor);
  const conditions: (SQL | undefined)[] = [
    query.actorId ? eq(adminActions.actorId, query.actorId) : undefined,
    query.action ? eq(adminActions.action, query.action) : undefined,
    query.targetType ? eq(adminActions.targetType, query.targetType) : undefined,
    query.targetId ? eq(adminActions.targetId, query.targetId) : undefined,
    query.period
      ? gte(adminActions.createdAt, new Date(now.getTime() - periodMs[query.period]))
      : undefined,
  ];
  const where = and(...conditions);

  const rows = await db
    .select({
      id: adminActions.id,
      createdAt: adminActions.createdAt,
      actorId: adminActions.actorId,
      firstName: users.firstName,
      email: users.email,
      action: adminActions.action,
      targetType: adminActions.targetType,
      targetId: adminActions.targetId,
      reason: adminActions.reason,
      before: adminActions.before,
      after: adminActions.after,
    })
    .from(adminActions)
    .leftJoin(users, eq(users.id, adminActions.actorId))
    .where(where)
    .orderBy(desc(adminActions.createdAt), desc(adminActions.id))
    .limit(adminActionsPageSize)
    .offset(offset);
  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(adminActions)
    .where(where);
  const total = counted?.total ?? 0;
  const labels = await targetLabelsOf(db, rows);
  return {
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actor: row.actorId ? { id: row.actorId, name: nameOf(row) } : null,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      targetLabel: labels.get(`${row.targetType}:${row.targetId}`) ?? null,
      reason: row.reason,
      before: row.before,
      after: row.after,
    })),
    total,
    offset,
    ...neighbourCursors(offset, total, adminActionsPageSize),
  };
}

/** Authors, kinds of action and kinds of target the journal holds, for the filters of A-12. */
export async function readAdminActionFilters(db: Db): Promise<AdminActionFilters> {
  const [actors, actions, targetTypes] = await Promise.all([
    db
      .selectDistinct({ id: users.id, firstName: users.firstName, email: users.email })
      .from(adminActions)
      .innerJoin(users, eq(users.id, adminActions.actorId))
      .orderBy(asc(users.firstName), asc(users.id))
      .limit(200),
    db
      .selectDistinct({ action: adminActions.action })
      .from(adminActions)
      .orderBy(asc(adminActions.action)),
    db
      .selectDistinct({ targetType: adminActions.targetType })
      .from(adminActions)
      .orderBy(asc(adminActions.targetType)),
  ]);
  return {
    actors: actors.map((actor) => ({ id: actor.id, name: nameOf(actor) })),
    actions: actions.map((row) => row.action),
    targetTypes: targetTypes.map((row) => row.targetType),
  };
}
