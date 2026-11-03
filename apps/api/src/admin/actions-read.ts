import {
  adminActionsPageSize,
  type AdminActionFilters,
  type AdminActionPeriod,
  type AdminActions,
  type AdminActionsQuery,
  type AdminActionTargetType,
} from '@widoo/shared';
import { and, asc, desc, eq, gte, inArray, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client';
import {
  adminActions,
  affiliatePrograms,
  b2bClients,
  places,
  routeRatings,
  routeReports,
  routes,
  supportMessages,
  users,
} from '../db/schema';
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

type TargetName = { id: string; name: string | null };

/**
 * How each kind of target is named, from the ids of a page: one query per kind. A report and a
 * rating are named by their route, a support message by its topic. A setting has none here: the
 * admin labels its key.
 */
const targetNamers: Partial<
  Record<AdminActionTargetType, (db: Db, ids: string[]) => Promise<TargetName[]>>
> = {
  user: async (db, ids) =>
    (
      await db
        .select({ id: users.id, firstName: users.firstName, email: users.email })
        .from(users)
        .where(inArray(users.id, ids))
    ).map((row) => ({ id: row.id, name: nameOf(row) })),
  route: (db, ids) =>
    db.select({ id: routes.id, name: routes.title }).from(routes).where(inArray(routes.id, ids)),
  route_report: (db, ids) =>
    db
      .select({ id: routeReports.id, name: routes.title })
      .from(routeReports)
      .innerJoin(routes, eq(routes.id, routeReports.routeId))
      .where(inArray(routeReports.id, ids)),
  rating: (db, ids) =>
    db
      .select({ id: routeRatings.id, name: routes.title })
      .from(routeRatings)
      .innerJoin(routes, eq(routes.id, routeRatings.routeId))
      .where(inArray(routeRatings.id, ids)),
  place: (db, ids) =>
    db.select({ id: places.id, name: places.name }).from(places).where(inArray(places.id, ids)),
  affiliate_program: (db, ids) =>
    db
      .select({ id: affiliatePrograms.id, name: affiliatePrograms.name })
      .from(affiliatePrograms)
      .where(inArray(affiliatePrograms.id, ids)),
  b2b_client: (db, ids) =>
    db
      .select({ id: b2bClients.id, name: b2bClients.name })
      .from(b2bClients)
      .where(inArray(b2bClients.id, ids)),
  support_message: (db, ids) =>
    db
      .select({ id: supportMessages.id, name: supportMessages.topic })
      .from(supportMessages)
      .where(inArray(supportMessages.id, ids)),
};

const hasNamer = (type: string): type is keyof typeof targetNamers =>
  Object.hasOwn(targetNamers, type);

/**
 * What the targets of a page are called today, by `type:id`, one query per kind of target on the
 * page. An object deleted since, or an account with no name left, has no label.
 */
async function targetLabelsOf(db: Db, rows: TargetRow[]): Promise<Map<string, string>> {
  const idsByType = new Map<keyof typeof targetNamers, Set<string>>();
  for (const row of rows) {
    if (hasNamer(row.targetType) && uuidPattern.test(row.targetId)) {
      const ids = idsByType.get(row.targetType) ?? new Set<string>();
      ids.add(row.targetId);
      idsByType.set(row.targetType, ids);
    }
  }
  const named = await Promise.all(
    [...idsByType].map(async ([type, ids]) => {
      const names = (await targetNamers[type]?.(db, [...ids])) ?? [];
      return names.map((target) => ({ type, ...target }));
    }),
  );
  const labels = new Map<string, string>();
  for (const target of named.flat()) {
    if (target.name) labels.set(`${target.type}:${target.id}`, target.name);
  }
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
