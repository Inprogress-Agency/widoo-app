import {
  adminReportsPageSize,
  type AdminReportsQuery,
  type AdminRouteReports,
  type ReportAlreadyDecidedDetails,
  type ResolvedReport,
} from '@widoo/shared';
import { eq, sql } from 'drizzle-orm';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import { recordAdminAction } from '../admin/actions';
import type { Db } from '../db/client';
import { notifications, routeReports } from '../db/schema';
import { httpError } from '../errors';

type ReportRow = {
  id: string;
  reason: AdminRouteReports['items'][number]['reason'];
  comment: string | null;
  created_at: Date;
  route_id: string;
  route_title: string;
  route_status: AdminRouteReports['items'][number]['route']['status'];
  is_official: boolean;
  city_name: string;
  author_id: string | null;
  author_first_name: string | null;
  reporter_id: string | null;
  reporter_first_name: string | null;
  step_position: number | null;
  place_name: string | null;
  open_on_route: number;
};

const toReport = (row: ReportRow): AdminRouteReports['items'][number] => ({
  id: row.id,
  reason: row.reason,
  comment: row.comment,
  createdAt: new Date(row.created_at).toISOString(),
  route: {
    id: row.route_id,
    title: row.route_title,
    status: row.route_status,
    isOfficial: row.is_official,
    cityName: row.city_name,
  },
  author: row.author_id ? { id: row.author_id, firstName: row.author_first_name } : null,
  reporter: row.reporter_id ? { id: row.reporter_id, firstName: row.reporter_first_name } : null,
  step:
    row.step_position === null || row.place_name === null
      ? null
      : { position: row.step_position, placeName: row.place_name },
  openOnRoute: row.open_on_route,
});

/**
 * A page of the open reports of routes (A-03), the oldest first. Deleted accounts are left out of
 * the names: the report stays, its author or reporter reads as unknown.
 */
export async function readOpenRouteReports(
  db: Db,
  query: AdminReportsQuery,
): Promise<AdminRouteReports> {
  const offset = offsetOfCursor(query.cursor);
  const where = query.reason
    ? sql`rr.status = 'open' and rr.reason = ${query.reason}`
    : sql`rr.status = 'open'`;
  const from = sql`from route_reports rr
    join routes r on r.id = rr.route_id
    join cities c on c.id = r.city_id
    left join users a on a.id = r.author_id and a.deleted_at is null
    left join users rp on rp.id = rr.user_id and rp.deleted_at is null
    left join steps s on s.id = rr.step_id
    left join places p on p.id = s.place_id`;

  const rows = await db.execute<ReportRow>(sql`
    select rr.id, rr.reason, rr.comment, rr.created_at,
      r.id as route_id, r.title as route_title, r.status as route_status, r.is_official, c.name as city_name,
      a.id as author_id, a.first_name as author_first_name,
      rp.id as reporter_id, rp.first_name as reporter_first_name,
      s.position as step_position, coalesce(s.title, p.name) as place_name,
      (select count(*)::int from route_reports o
        where o.route_id = rr.route_id and o.status = 'open') as open_on_route
    ${from}
    where ${where}
    order by rr.created_at asc, rr.id
    limit ${adminReportsPageSize} offset ${offset}`);
  const [counted] = await db.execute<{ total: number }>(
    sql`select count(*)::int as total ${from} where ${where}`,
  );
  const total = counted?.total ?? 0;
  return {
    items: rows.map(toReport),
    total,
    offset,
    ...neighbourCursors(offset, total, adminReportsPageSize),
  };
}

type ResolveInput = {
  reportId: string;
  /** The member of the team who decides. */
  actorId: string;
  outcome: 'accepted' | 'rejected';
  note?: string;
};

/**
 * Decides an open report (A-03, D-056): `accepted` thanks the reporter with a notification
 * (`report_resolved`), `rejected` sends nothing. The note stays in the journal of the admin. The
 * report is locked while it is decided: a report that is no longer open answers 409
 * `already_decided` with the status the first decision gave it. What happens to the route itself
 * (unpublishing, a request for changes) is its own decision, made with the moderation actions.
 */
export async function resolveRouteReport(
  db: Db,
  input: ResolveInput,
  now = new Date(),
): Promise<ResolvedReport> {
  return db.transaction(async (tx) => {
    const [report] = await tx
      .select({
        status: routeReports.status,
        userId: routeReports.userId,
        routeId: routeReports.routeId,
      })
      .from(routeReports)
      .where(eq(routeReports.id, input.reportId))
      .for('update');
    if (!report) {
      throw httpError(404, 'Report not found');
    }
    if (report.status !== 'open') {
      const details: ReportAlreadyDecidedDetails = { status: report.status };
      throw httpError(409, 'Report already decided', 'already_decided', details);
    }

    await tx
      .update(routeReports)
      .set({ status: input.outcome, reviewedBy: input.actorId, reviewedAt: now })
      .where(eq(routeReports.id, input.reportId));
    if (input.outcome === 'accepted' && report.userId) {
      await tx.insert(notifications).values({
        userId: report.userId,
        kind: 'report_resolved',
        payload: { reportId: input.reportId, routeId: report.routeId },
      });
    }
    await recordAdminAction(tx, {
      actorId: input.actorId,
      action: 'report.resolve',
      targetType: 'route_report',
      targetId: input.reportId,
      before: { status: 'open' },
      after: { status: input.outcome },
      reason: input.note,
    });
    return { id: input.reportId, status: input.outcome };
  });
}
