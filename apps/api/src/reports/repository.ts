/**
 * Reports of a route by its readers (wiki Creation-et-Moderation › Signaler un parcours, D-056,
 * D-057). The rule of the 7 days is `blocksNewRouteReport` of `@widoo/shared`; this module reads
 * the reports it applies to and writes a new one only when none blocks it.
 */
import {
  blocksNewRouteReport,
  routeReportWindowStart,
  type ReportStatus,
  type UserRouteReportReason,
} from '@widoo/shared';
import { and, desc, eq, gt } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { routeReports, steps, users } from '../db/schema';
import { bodyValidationError, conflict } from '../errors';

export type NewRouteReport = {
  routeId: string;
  userId: string;
  reason: UserRouteReportReason;
  /** The step of the place, for `place_changed` only. */
  stepId?: string | null;
  comment?: string | null;
};

/** The report of the user on the route that still runs at `now`, for `myReport` (D-057). */
export type RunningRouteReport = { id: string; status: ReportStatus; createdAt: Date };

/**
 * The report of `userId` on `routeId` that refuses a new one at `now`, or null: the most recent
 * report of the window that `blocksNewRouteReport` holds.
 */
export async function runningRouteReport(
  db: Db | Tx,
  routeId: string,
  userId: string,
  now: Date,
): Promise<RunningRouteReport | null> {
  const inWindow = await db
    .select({ id: routeReports.id, status: routeReports.status, createdAt: routeReports.createdAt })
    .from(routeReports)
    .where(
      and(
        eq(routeReports.routeId, routeId),
        eq(routeReports.userId, userId),
        gt(routeReports.createdAt, routeReportWindowStart(now)),
      ),
    )
    .orderBy(desc(routeReports.createdAt));
  return inWindow.find((report) => blocksNewRouteReport(report, now)) ?? null;
}

/**
 * Writes the report of a reader, dated `now`. Throws 409 `conflict` with `details.reportedAt`
 * while an earlier one still runs, and 422 when `stepId` is not a step of the route. The
 * reporter's row is locked first: two reports sent at once (the offline queue of the app sending
 * again) wait for each other, so that only one gets through.
 */
export async function createRouteReport(
  tx: Tx,
  report: NewRouteReport,
  now: Date = new Date(),
): Promise<{ id: string; createdAt: Date }> {
  await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, report.userId))
    .for('no key update');
  const running = await runningRouteReport(tx, report.routeId, report.userId, now);
  if (running) {
    throw conflict('Route already reported', { reportedAt: running.createdAt.toISOString() });
  }
  if (report.stepId) {
    const [step] = await tx
      .select({ id: steps.id })
      .from(steps)
      .where(and(eq(steps.id, report.stepId), eq(steps.routeId, report.routeId)));
    if (!step) {
      throw bodyValidationError([
        { path: 'stepId', code: 'invalid_value', message: 'Not a step of this route' },
      ]);
    }
  }
  const [created] = await tx
    .insert(routeReports)
    .values({
      routeId: report.routeId,
      userId: report.userId,
      reason: report.reason,
      stepId: report.stepId ?? null,
      comment: report.comment ?? null,
      createdAt: now,
    })
    .returning({ id: routeReports.id, createdAt: routeReports.createdAt });
  if (!created) throw new Error('Route report not written');
  return created;
}
