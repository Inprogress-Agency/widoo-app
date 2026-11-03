import {
  closureReasons,
  daysBefore,
  type PlaceVerification,
  type SignalReason,
  type VerificationRules,
} from '@widoo/shared';
import { and, eq, gt, inArray, isNull, max, or, sql, type SQLWrapper } from 'drizzle-orm';
import type { Db } from '../db/client';
import { cities, placeSignals, places } from '../db/schema';

/** What the visitors said of a place, for `verification` of the sheet; `lastConfirmedAt` apart. */
export type PlaceSignalSummary = Pick<PlaceVerification, 'confirmations' | 'reports'>;

const closedToday = 'closed_today' satisfies SignalReason;
/** Closures that hold while the place stays flagged on them, until the team decides. */
const lastingClosures = closureReasons.filter((reason) => reason !== closedToday);

/**
 * What the visitors said of the places of a sheet (wiki API › Fiche parcours, D-013, D-056), by
 * place: the distinct visitors who confirmed it over the validity of a verification, and those
 * who report it closed while it holds: « fermé aujourd'hui » until midnight in its city (D-036),
 * « fermé temporairement » or « définitivement » while the place is flagged and since its last
 * verification. Only open signals of a weight above zero count. A place without any is absent.
 */
export async function placeSignalSummaries(
  db: Db,
  placeIds: readonly string[],
  { now, rules }: { now: Date; rules: VerificationRules },
): Promise<Map<string, PlaceSignalSummary>> {
  if (placeIds.length === 0) return new Map();
  const ofPlaces = and(
    inArray(placeSignals.placeId, [...placeIds]),
    eq(placeSignals.status, 'open'),
    gt(placeSignals.weight, 0),
  );
  const visitors = sql<number>`count(distinct ${placeSignals.userId})::int`;
  const localDay = (instant: SQLWrapper) => sql`(${instant} at time zone ${cities.timezone})::date`;
  const [confirmed, reported] = await Promise.all([
    db
      .select({ placeId: placeSignals.placeId, visitors })
      .from(placeSignals)
      .where(
        and(
          ofPlaces,
          eq(placeSignals.kind, 'confirm'),
          gt(placeSignals.createdAt, daysBefore(now, rules.staleAfterDays)),
        ),
      )
      .groupBy(placeSignals.placeId),
    db
      .select({ placeId: placeSignals.placeId, visitors, lastAt: max(placeSignals.createdAt) })
      .from(placeSignals)
      .innerJoin(places, eq(places.id, placeSignals.placeId))
      .innerJoin(cities, eq(cities.id, places.cityId))
      .where(
        and(
          ofPlaces,
          eq(placeSignals.kind, 'report'),
          or(
            and(
              eq(placeSignals.reason, closedToday),
              sql`${localDay(placeSignals.createdAt)} = ${localDay(sql`${now.toISOString()}::timestamptz`)}`,
            ),
            and(
              eq(places.verificationStatus, 'flagged'),
              inArray(placeSignals.reason, lastingClosures),
              or(isNull(places.verifiedAt), gt(placeSignals.createdAt, places.verifiedAt)),
            ),
          ),
        ),
      )
      .groupBy(placeSignals.placeId),
  ]);
  const summaries = new Map<string, PlaceSignalSummary>();
  const summaryOf = (placeId: string) =>
    summaries.get(placeId) ?? { confirmations: 0, reports: null };
  for (const row of confirmed) {
    summaries.set(row.placeId, { ...summaryOf(row.placeId), confirmations: row.visitors });
  }
  for (const row of reported) {
    if (!row.lastAt) continue;
    const reports = { count: row.visitors, lastAt: row.lastAt.toISOString() };
    summaries.set(row.placeId, { ...summaryOf(row.placeId), reports });
  }
  return summaries;
}
