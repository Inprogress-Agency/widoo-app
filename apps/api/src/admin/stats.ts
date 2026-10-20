import {
  adminLateAfterHours,
  canOpenAdminSection,
  countedAdminSections,
  type AdminStats,
  type AdminToHandle,
  type CountedAdminSection,
  type UserRole,
} from '@widoo/shared';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';

type StatsRow = {
  pending: number;
  pending_late: number;
  pending_oldest: Date | null;
  reports: number;
  reports_late: number;
  reports_oldest: Date | null;
  flagged_places: number;
  support: number;
  support_late: number;
  support_oldest: Date | null;
  published_routes: number;
  premium_routes: number;
  official_routes: number;
  places_in_routes: number;
  cities: number;
  active_creators: number;
  registered: number;
  new_users: number;
  premium_active: number;
};

const day = 24 * 60 * 60 * 1000;
const ago = (now: Date, ms: number) => new Date(now.getTime() - ms).toISOString();

/**
 * The figures of the dashboard (A-05), read in one query. « À traiter » follows the role, as the
 * counters of the navigation do. Deleted accounts
 * are left out of every figure about users.
 */
export async function readAdminStats(
  db: Db,
  role: UserRole,
  now = new Date(),
): Promise<AdminStats> {
  const lateBefore = ago(now, adminLateAfterHours * 60 * 60 * 1000);
  const [row] = await db.execute<StatsRow>(sql`
    select
      (select count(*)::int from routes where status = 'pending') as pending,
      (select count(*)::int from routes
        where status = 'pending' and updated_at < ${lateBefore}::timestamptz) as pending_late,
      (select min(updated_at) from routes where status = 'pending') as pending_oldest,
      (select count(*)::int from route_reports where status = 'open') as reports,
      (select count(*)::int from route_reports
        where status = 'open' and created_at < ${lateBefore}::timestamptz) as reports_late,
      (select min(created_at) from route_reports where status = 'open') as reports_oldest,
      (select count(*)::int from places where verification_status = 'flagged') as flagged_places,
      (select count(*)::int from support_messages where handled_at is null) as support,
      (select count(*)::int from support_messages
        where handled_at is null and created_at < ${lateBefore}::timestamptz) as support_late,
      (select min(created_at) from support_messages where handled_at is null) as support_oldest,
      (select count(*)::int from routes where status = 'published') as published_routes,
      (select count(*)::int from routes
        where status = 'published' and access = 'premium') as premium_routes,
      (select count(*)::int from routes where status = 'published' and is_official)
        as official_routes,
      (select count(distinct s.place_id)::int from steps s) as places_in_routes,
      (select count(distinct city_id)::int from routes where status = 'published') as cities,
      (select count(distinct author_id)::int from routes
        where author_id is not null and updated_at >= ${ago(now, 30 * day)}::timestamptz)
        as active_creators,
      (select count(*)::int from users where deleted_at is null) as registered,
      (select count(*)::int from users
        where deleted_at is null and created_at >= ${ago(now, 7 * day)}::timestamptz) as new_users,
      (select count(*)::int from users
        where deleted_at is null and plan = 'premium'
          and (plan_expires_at is null or plan_expires_at > ${now.toISOString()}::timestamptz))
        as premium_active`);
  if (!row) {
    throw new Error('Dashboard figures not read');
  }

  // What waits in each section. AI drafts and failed translations have no table yet: nothing can
  // wait there, and each one gets its query with its section. The signals of places join the
  // reports with `place_signals`.
  const nothing: AdminToHandle = { count: 0, lateCount: 0, oldestSince: null };
  const waiting: Record<CountedAdminSection, AdminToHandle> = {
    moderation: {
      count: row.pending,
      lateCount: row.pending_late,
      oldestSince: row.pending_oldest ? new Date(row.pending_oldest).toISOString() : null,
    },
    reports: {
      count: row.reports + row.flagged_places,
      lateCount: row.reports_late,
      oldestSince: row.reports_oldest ? new Date(row.reports_oldest).toISOString() : null,
    },
    support: {
      count: row.support,
      lateCount: row.support_late,
      oldestSince: row.support_oldest ? new Date(row.support_oldest).toISOString() : null,
    },
    aiDrafts: nothing,
    translations: nothing,
  };
  const toHandle: AdminStats['toHandle'] = {};
  for (const section of countedAdminSections) {
    if (canOpenAdminSection(role, section)) {
      toHandle[section] = waiting[section];
    }
  }
  return {
    toHandle,
    catalog: {
      publishedRoutes: row.published_routes,
      premiumRoutes: row.premium_routes,
      officialRoutes: row.official_routes,
      placesInRoutes: row.places_in_routes,
      cities: row.cities,
      activeCreators: row.active_creators,
    },
    users: {
      registered: row.registered,
      newLast7Days: row.new_users,
      premiumActive: row.premium_active,
      // No unit unlock exists yet (`route_unlocks`): none happened.
      unlocksLast30Days: 0,
    },
    generatedAt: now.toISOString(),
  };
}
