import {
  defaultPremiumMinSteps,
  taxonomies,
  type ModerationHistoryEntry,
  type ModerationRouteDetail,
  type ModerationStep,
} from '@widoo/shared';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { readSetting } from '../search/settings';

export const premiumMinStepsKey = 'premium.min_steps';

type RouteRow = {
  id: string;
  title: string;
  description: string | null;
  status: ModerationRouteDetail['status'];
  moods: ModerationRouteDetail['moods'];
  city_name: string;
  waiting_since: Date;
  computed: Record<string, unknown> | null;
  photos: string[] | null;
  author_id: string | null;
  author_first_name: string | null;
  author_registered_at: Date | null;
  author_published: number;
  author_rejected: number;
};

type StepRow = {
  id: string;
  position: number;
  title: string | null;
  duration_min: number;
  cost_per_person: number | null;
  booking_url: string | null;
  transition: { mode?: string; duration_min?: number; distance_m?: number } | null;
  place_id: string;
  place_name: string;
  category: ModerationStep['place']['category'];
  lat: number;
  lng: number;
  verification_status: ModerationStep['place']['verificationStatus'];
};

type HistoryRow = {
  action: ModerationHistoryEntry['action'];
  actor_name: string | null;
  reason_code: ModerationHistoryEntry['reasonCode'];
  message: string | null;
  created_at: Date;
};

type QueueRow = {
  position: number;
  total: number;
  previous_id: string | null;
  next_id: string | null;
};

const httpsOnly = (urls: readonly string[]) => urls.filter((url) => url.startsWith('https://'));
const numberOrNull = (value: unknown) => (typeof value === 'number' ? value : null);
const stringsOf = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function toStep(row: StepRow): ModerationStep {
  const { transition } = row;
  const mode = taxonomies.transports.find((transport) => transport === transition?.mode);
  return {
    id: row.id,
    position: row.position,
    title: row.title ?? row.place_name,
    durationMin: row.duration_min,
    costPerPersonEur: row.cost_per_person === null ? null : Number(row.cost_per_person),
    bookingUrl: row.booking_url?.startsWith('https://') ? row.booking_url : null,
    transition:
      transition && mode
        ? {
            mode,
            durationMin: transition.duration_min ?? 0,
            distanceM: transition.distance_m ?? 0,
          }
        : null,
    place: {
      id: row.place_id,
      name: row.place_name,
      category: row.category,
      location: { lat: row.lat, lng: row.lng },
      verificationStatus: row.verification_status,
    },
  };
}

/** Steps a route needs to be Premium: the setting of the team, or 4. */
async function readPremiumMinSteps(db: Db): Promise<number> {
  const value = await readSetting(db, premiumMinStepsKey);
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : defaultPremiumMinSteps;
}

/**
 * The moderation sheet of a route (A-02): the route as it will be published, its warnings, its
 * author, its history and its place in the queue. Undefined when the route does not exist.
 */
export async function readModerationRoute(
  db: Db,
  routeId: string,
): Promise<ModerationRouteDetail | undefined> {
  const [route] = await db.execute<RouteRow>(sql`
    select r.id, r.title, r.description, r.status, r.moods, r.computed,
      c.name as city_name, r.updated_at as waiting_since,
      (select array_agg(m.storage_path order by m.position) from media m
        where m.owner_type = 'route' and m.owner_id = r.id) as photos,
      u.id as author_id, u.first_name as author_first_name, u.created_at as author_registered_at,
      (select count(*)::int from routes a where a.author_id = u.id and a.status = 'published')
        as author_published,
      (select count(*)::int from routes a where a.author_id = u.id and a.status = 'rejected')
        as author_rejected
    from routes r
      join cities c on c.id = r.city_id
      left join users u on u.id = r.author_id and u.deleted_at is null
    where r.id = ${routeId}`);
  if (!route) {
    return undefined;
  }

  const steps = await db.execute<StepRow>(sql`
    select s.id, s.position, s.title, s.duration_min, s.cost_per_person, s.booking_url,
      s.transition, p.id as place_id, p.name as place_name, p.category,
      ST_Y(p.location::geometry) as lat, ST_X(p.location::geometry) as lng,
      p.verification_status
    from steps s join places p on p.id = s.place_id
    where s.route_id = ${routeId}
    order by s.position`);

  const history = await db.execute<HistoryRow>(sql`
    select a.action, coalesce(u.first_name, split_part(u.email, '@', 1)) as actor_name, a.reason_code, a.message, a.created_at
    from moderation_actions a left join users u on u.id = a.actor_id
    where a.route_id = ${routeId}
    order by a.created_at desc`);

  // The routes waiting for the team, oldest first, as the queue lists them by default.
  const [queue] = await db.execute<QueueRow>(sql`
    select position, total, previous_id, next_id from (
      select id,
        (row_number() over waiting)::int as position,
        (count(*) over ())::int as total,
        lag(id) over waiting as previous_id,
        lead(id) over waiting as next_id
      from routes
      where status = 'pending'
      window waiting as (order by updated_at, id)
    ) queued
    where id = ${routeId}`);

  const premiumMinSteps = await readPremiumMinSteps(db);
  const computed = route.computed ?? {};
  return {
    id: route.id,
    title: route.title,
    description: route.description,
    status: route.status,
    // No revision and no certification exist yet: see `queue.ts`.
    isRevision: false,
    isPremiumComputed: steps.length >= premiumMinSteps,
    premiumMinSteps,
    moods: route.moods,
    cityName: route.city_name,
    waitingSince: new Date(route.waiting_since).toISOString(),
    warnings: stringsOf(computed.warnings),
    photoUrls: httpsOnly(route.photos ?? []),
    durationMin: numberOrNull(computed.duration_min),
    budgetPerPersonEur: numberOrNull(computed.budget_per_person_eur),
    distanceM: numberOrNull(computed.distance_m),
    steps: steps.map(toStep),
    author:
      route.author_id && route.author_registered_at
        ? {
            id: route.author_id,
            firstName: route.author_first_name,
            isCertified: false,
            registeredAt: new Date(route.author_registered_at).toISOString(),
            publishedRouteCount: route.author_published,
            rejectedRouteCount: route.author_rejected,
            // No report exists yet (`route_reports`): none was received.
            reportsReceivedCount: 0,
          }
        : null,
    // No revision exists yet: nothing to compare with a published version.
    revisionChanges: [],
    publishedVersionAt: null,
    history: history.map((entry) => ({
      action: entry.action,
      actorName: entry.actor_name,
      reasonCode: entry.reason_code,
      message: entry.message,
      createdAt: new Date(entry.created_at).toISOString(),
    })),
    queue: queue
      ? {
          position: queue.position,
          total: queue.total,
          previousId: queue.previous_id,
          nextId: queue.next_id,
        }
      : null,
  };
}
