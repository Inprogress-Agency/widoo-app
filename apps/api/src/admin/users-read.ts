import {
  adminUsersPageSize,
  isCertifiedWith,
  type AdminUserDetail,
  type AdminUserListItem,
  type AdminUsers,
  type AdminUsersQuery,
} from '@widoo/shared';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import {
  routeRatings,
  routeReports,
  routeUnlocks,
  routes,
  supportMessages,
  users,
} from '../db/schema';
import { neighbourCursors, offsetOfCursor } from './page-cursor';

type UserRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  role: AdminUserListItem['role'];
  plan: AdminUserListItem['plan']['plan'];
  plan_source: AdminUserListItem['plan']['source'];
  plan_expires_at: Date | null;
  created_at: Date;
  suspended_at: Date | null;
  created_route_count: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A search text as a `like` pattern: the user's `%` and `_` search themselves. */
const likePatternOf = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

const isoOrNull = (date: Date | null) => (date ? new Date(date).toISOString() : null);

const toListItem = (row: UserRow): AdminUserListItem => ({
  id: row.id,
  firstName: row.first_name,
  email: row.email,
  role: row.role,
  plan: {
    plan: row.plan,
    source: row.plan_source,
    expiresAt: isoOrNull(row.plan_expires_at),
  },
  createdRouteCount: row.created_route_count,
  createdAt: new Date(row.created_at).toISOString(),
  suspendedAt: isoOrNull(row.suspended_at),
});

/**
 * A page of the accounts (A-06), the newest first. Deleted accounts are left out: they have no
 * data left to read. The search matches an e-mail or a first name by part, an identifier whole.
 */
export async function readUsers(db: Db, query: AdminUsersQuery): Promise<AdminUsers> {
  const offset = offsetOfCursor(query.cursor);
  const search = query.q;
  const where = search
    ? sql`u.deleted_at is null and (u.email ilike ${likePatternOf(search)}
        or u.first_name ilike ${likePatternOf(search)}
        ${uuidPattern.test(search) ? sql`or u.id = ${search.toLowerCase()}::uuid` : sql``})`
    : sql`u.deleted_at is null`;

  const rows = await db.execute<UserRow>(sql`
    select u.id, u.first_name, u.email, u.role, u.plan, u.plan_source, u.plan_expires_at,
      u.created_at, u.suspended_at,
      (select count(*)::int from routes r where r.author_id = u.id) as created_route_count
    from users u
    where ${where}
    order by u.created_at desc, u.id
    limit ${adminUsersPageSize} offset ${offset}`);
  const [counted] = await db.execute<{ total: number }>(
    sql`select count(*)::int as total from users u where ${where}`,
  );
  const total = counted?.total ?? 0;
  return {
    items: rows.map(toListItem),
    total,
    offset,
    ...neighbourCursors(offset, total, adminUsersPageSize),
  };
}

/** Lists of a card are cut here: the team follows the rest in the section of each object. */
const cardListLimit = 50;

async function readReports(
  db: Db,
  by: { reporterId: string } | { authorId: string },
): Promise<AdminUserDetail['reportsMade']> {
  const rows = await db
    .select({
      id: routeReports.id,
      reason: routeReports.reason,
      status: routeReports.status,
      createdAt: routeReports.createdAt,
      routeId: routes.id,
      routeTitle: routes.title,
    })
    .from(routeReports)
    .innerJoin(routes, eq(routes.id, routeReports.routeId))
    .where(
      'reporterId' in by
        ? eq(routeReports.userId, by.reporterId)
        : eq(routes.authorId, by.authorId),
    )
    .orderBy(desc(routeReports.createdAt))
    .limit(cardListLimit);
  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    route: { id: row.routeId, title: row.routeTitle },
    createdAt: row.createdAt.toISOString(),
  }));
}

/** The ratings given by an account, or received on its routes, the latest first. */
async function readRatings(
  db: Db,
  by: { raterId: string } | { authorId: string },
): Promise<AdminUserDetail['ratingsGiven']> {
  const rows = await db
    .select({
      id: routeRatings.id,
      rating: routeRatings.rating,
      comment: routeRatings.comment,
      status: routeRatings.status,
      createdAt: routeRatings.createdAt,
      routeId: routes.id,
      routeTitle: routes.title,
    })
    .from(routeRatings)
    .innerJoin(routes, eq(routes.id, routeRatings.routeId))
    .where('raterId' in by ? eq(routeRatings.userId, by.raterId) : eq(routes.authorId, by.authorId))
    .orderBy(desc(routeRatings.createdAt), desc(routeRatings.id))
    .limit(cardListLimit);
  return rows.map((row) => ({
    id: row.id,
    route: { id: row.routeId, title: row.routeTitle },
    score: row.rating,
    comment: row.comment,
    isHidden: row.status === 'hidden',
    createdAt: row.createdAt.toISOString(),
  }));
}

/** The card of an account (A-06), or null when it does not exist or was deleted. */
export async function readUserDetail(db: Db, userId: string): Promise<AdminUserDetail | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!user) {
    return null;
  }
  const [
    unlocks,
    createdRoutes,
    reportsMade,
    reportsReceived,
    ratingsGiven,
    ratingsReceived,
    messages,
  ] = await Promise.all([
    db
      .select({
        id: routes.id,
        title: routes.title,
        source: routeUnlocks.source,
        unlockedAt: routeUnlocks.createdAt,
      })
      .from(routeUnlocks)
      .innerJoin(routes, eq(routes.id, routeUnlocks.routeId))
      .where(eq(routeUnlocks.userId, userId))
      .orderBy(desc(routeUnlocks.createdAt))
      .limit(cardListLimit),
    db
      .select({ id: routes.id, title: routes.title, status: routes.status })
      .from(routes)
      .where(eq(routes.authorId, userId))
      .orderBy(desc(routes.createdAt))
      .limit(cardListLimit),
    readReports(db, { reporterId: userId }),
    readReports(db, { authorId: userId }),
    readRatings(db, { raterId: userId }),
    readRatings(db, { authorId: userId }),
    db
      .select({
        id: supportMessages.id,
        topic: supportMessages.topic,
        createdAt: supportMessages.createdAt,
        handledAt: supportMessages.handledAt,
      })
      .from(supportMessages)
      .where(eq(supportMessages.userId, userId))
      .orderBy(desc(supportMessages.createdAt))
      .limit(cardListLimit),
  ]);
  const [created] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(routes)
    .where(eq(routes.authorId, userId));

  return {
    ...toListItem({
      id: user.id,
      first_name: user.firstName,
      email: user.email,
      role: user.role,
      plan: user.plan,
      plan_source: user.planSource,
      plan_expires_at: user.planExpiresAt,
      created_at: user.createdAt,
      suspended_at: user.suspendedAt,
      created_route_count: created?.count ?? 0,
    }),
    suspensionReason: user.suspensionReason,
    isPublic: user.isPublic,
    certification: {
      isCertified: isCertifiedWith(user.isCertified, user.certifiedOverride),
      computed: user.isCertified,
      override: user.certifiedOverride,
      certifiedAt: isoOrNull(user.certifiedAt),
    },
    unlockedRoutes: unlocks.map((row) => ({
      id: row.id,
      title: row.title,
      source: row.source,
      unlockedAt: row.unlockedAt.toISOString(),
    })),
    createdRoutes,
    reportsMade,
    reportsReceived,
    ratingsGiven,
    ratingsReceived,
    supportMessages: messages.map((row) => ({
      id: row.id,
      topic: row.topic,
      createdAt: row.createdAt.toISOString(),
      handledAt: isoOrNull(row.handledAt),
    })),
  };
}
