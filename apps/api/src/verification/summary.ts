import {
  closureReasons,
  daysBefore,
  type PlaceVerification,
  type SignalReason,
  type VerificationRules,
} from '@widoo/shared';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { placeSignals } from '../db/schema';
import { didStepInCompletedGo } from './visits';

/** What the visitors said of a place, for `verification` of the sheet; `lastConfirmedAt` apart. */
export type PlaceSignalSummary = Pick<PlaceVerification, 'confirmations' | 'reports'>;

const closedToday = 'closed_today' satisfies SignalReason;
/** Closures that hold while the place stays flagged on them, until the team decides. */
const lastingClosures = closureReasons.filter((reason) => reason !== closedToday);

const listOf = (values: readonly string[]) =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );

/**
 * The distinct visitors who say each place closed while it holds, and their last report, from
 * open reports of a weight above zero: « fermé aujourd'hui » until midnight in the city of the
 * place (D-036); « fermé temporairement » or « définitivement » while the place is flagged and
 * since its last verification, once that reason reached the threshold of `flagged` on its own
 * (`flagsPlace`): distinct accounts within the window that ends at one of its reports, or one
 * « définitivement » from an account that had done the step in a Go it completed.
 */
function closureReports(
  db: Db,
  placeIds: readonly string[],
  { now, rules }: { now: Date; rules: VerificationRules },
) {
  const at = sql`${now.toISOString()}::timestamptz`;
  const window = sql`make_interval(hours => ${rules.reportWindowDays * 24})`;
  return db.execute<{ place_id: string; visitors: number; last_at: string }>(sql`
    with reports as (
      select s.place_id, s.user_id, s.reason, s.created_at,
        p.verification_status, p.verified_at, c.timezone
      from place_signals s
      join places p on p.id = s.place_id
      join cities c on c.id = p.city_id
      where s.place_id in (${listOf(placeIds)})
        and s.kind = 'report' and s.status = 'open' and s.weight > 0
        and s.reason in (${listOf(closureReasons)})
    ),
    lasting as (
      select * from reports
      where verification_status = 'flagged'
        and reason in (${listOf(lastingClosures)})
        and (verified_at is null or created_at > verified_at)
    ),
    reached as (
      select distinct r.place_id, r.reason from lasting r
      where (
          select count(distinct w.user_id) from lasting w
          where w.place_id = r.place_id and w.reason = r.reason
            and w.created_at > r.created_at - ${window} and w.created_at <= r.created_at
        ) >= ${rules.reportsToFlag}
        or (r.reason = 'closed_permanently'
          and ${didStepInCompletedGo(sql`r.user_id`, sql`r.place_id`, sql`r.created_at`)})
    )
    select place_id, count(distinct user_id)::int as visitors, max(created_at) as last_at
    from (
      select place_id, user_id, created_at from reports
      where reason = ${closedToday}
        and (created_at at time zone timezone)::date = (${at} at time zone timezone)::date
      union all
      select place_id, user_id, created_at from lasting join reached using (place_id, reason)
    ) closures
    group by place_id`);
}

/**
 * What the visitors said of the places of a sheet (wiki API › Fiche parcours, D-013, D-056), by
 * place: the distinct visitors who confirmed it over the validity of a verification, and those
 * who report it closed while it holds (`closureReports`). Only open signals of a weight above
 * zero count. A place without any is absent.
 */
export async function placeSignalSummaries(
  db: Db,
  placeIds: readonly string[],
  { now, rules }: { now: Date; rules: VerificationRules },
): Promise<Map<string, PlaceSignalSummary>> {
  if (placeIds.length === 0) return new Map();
  const [confirmed, reported] = await Promise.all([
    db
      .select({
        placeId: placeSignals.placeId,
        visitors: sql<number>`count(distinct ${placeSignals.userId})::int`,
      })
      .from(placeSignals)
      .where(
        and(
          inArray(placeSignals.placeId, [...placeIds]),
          eq(placeSignals.status, 'open'),
          gt(placeSignals.weight, 0),
          eq(placeSignals.kind, 'confirm'),
          gt(placeSignals.createdAt, daysBefore(now, rules.staleAfterDays)),
        ),
      )
      .groupBy(placeSignals.placeId),
    closureReports(db, placeIds, { now, rules }),
  ]);
  const summaries = new Map<string, PlaceSignalSummary>();
  const summaryOf = (placeId: string) =>
    summaries.get(placeId) ?? { confirmations: 0, reports: null };
  for (const row of confirmed) {
    summaries.set(row.placeId, { ...summaryOf(row.placeId), confirmations: row.visitors });
  }
  for (const row of reported) {
    const reports = { count: row.visitors, lastAt: new Date(row.last_at).toISOString() };
    summaries.set(row.place_id, { ...summaryOf(row.place_id), reports });
  }
  return summaries;
}
