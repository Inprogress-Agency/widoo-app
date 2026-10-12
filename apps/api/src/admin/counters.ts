import {
  adminLateAfterHours,
  canOpenAdminSection,
  type AdminCounter,
  type AdminCounters,
  type UserRole,
} from '@widoo/shared';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { routes } from '../db/schema';

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
 * Counters of the navigation of the admin, for the sections `role` opens. Signals, support, AI
 * drafts and translations join as their tables arrive with their sections.
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
  return counters;
}
