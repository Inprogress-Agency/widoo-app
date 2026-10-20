import {
  adminLateAfterHours,
  canOpenAdminSection,
  type AdminCounter,
  type AdminCounters,
  type UserRole,
} from '@widoo/shared';
import { eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { places, routeReports, routes, supportMessages } from '../db/schema';

/**
 * Routes waiting for the team. Late after 72 hours without a change: until the history of a
 * route exists (`moderation_actions`, with the moderation queue), the last change of a pending
 * route stands for its submission.
 */
async function countPendingRoutes(db: Db, now: Date): Promise<AdminCounter> {
  const lateBefore = new Date(now.getTime() - adminLateAfterHours * 60 * 60 * 1000);
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      lateCount: sql<number>`(count(*) filter (where ${routes.updatedAt} < ${lateBefore.toISOString()}::timestamptz))::int`,
    })
    .from(routes)
    .where(eq(routes.status, 'pending'));
  return row ?? { count: 0, lateCount: 0 };
}

/**
 * What waits in A-03: the open reports of routes, late after 72 hours, and the places the
 * community flagged. A flagged place has no date until its signals are stored (`place_signals`),
 * so it is never late.
 */
async function countOpenReports(db: Db, now: Date): Promise<AdminCounter> {
  const lateBefore = new Date(now.getTime() - adminLateAfterHours * 60 * 60 * 1000);
  const [reports] = await db
    .select({
      count: sql<number>`count(*)::int`,
      lateCount: sql<number>`(count(*) filter (where ${routeReports.createdAt} < ${lateBefore.toISOString()}::timestamptz))::int`,
    })
    .from(routeReports)
    .where(eq(routeReports.status, 'open'));
  const [flagged] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(places)
    .where(eq(places.verificationStatus, 'flagged'));
  return {
    count: (reports?.count ?? 0) + (flagged?.count ?? 0),
    lateCount: reports?.lateCount ?? 0,
  };
}

/** The messages of « Nous écrire » the team has not handled, late after 72 hours. */
async function countUnhandledSupport(db: Db, now: Date): Promise<AdminCounter> {
  const lateBefore = new Date(now.getTime() - adminLateAfterHours * 60 * 60 * 1000);
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      lateCount: sql<number>`(count(*) filter (where ${supportMessages.createdAt} < ${lateBefore.toISOString()}::timestamptz))::int`,
    })
    .from(supportMessages)
    .where(isNull(supportMessages.handledAt));
  return row ?? { count: 0, lateCount: 0 };
}

/**
 * Counters of the navigation of the admin, for the sections `role` opens. AI drafts and
 * translations join as their tables arrive with their sections.
 */
export async function readAdminCounters(
  db: Db,
  role: UserRole,
  now = new Date(),
): Promise<AdminCounters> {
  const counters: AdminCounters = {};
  if (canOpenAdminSection(role, 'moderation')) {
    counters.moderation = await countPendingRoutes(db, now);
  }
  if (canOpenAdminSection(role, 'reports')) {
    counters.reports = await countOpenReports(db, now);
  }
  if (canOpenAdminSection(role, 'support')) {
    counters.support = await countUnhandledSupport(db, now);
  }
  return counters;
}
