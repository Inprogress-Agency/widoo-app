/**
 * `GET /routes/:id` and `GET /routes/:id/timeline` (wiki API › Fiche parcours, D-093): the route
 * the caller may read, or the same 404, or the 410 of a withdrawn route; then the sheet, on the
 * trips of this answer.
 */
import {
  computeTransitions,
  routeTimelineOf,
  type DirectionsProvider,
  type Transition,
} from '@widoo/orchestration';
import {
  isCertifiedWith,
  onlineRouteStatuses,
  type RouteDetail,
  type RouteStatus,
  type RouteTimeline,
} from '@widoo/shared';
import { and, eq, sql } from 'drizzle-orm';
import { routeViewerOf } from '../access/route-viewer';
import type { Db } from '../db/client';
import { routes, users } from '../db/schema';
import { httpError, premiumRequired, routeRemoved } from '../errors';
import { listRouteRatings } from '../ratings/reviews';
import { runningRouteReport } from '../reports/repository';
import { toCard } from '../search/repository';
import type { User } from '../users/repository';
import { sheetAccessOf } from './access';
import { buildSheet, routeInputOf } from './build';
import { loadSheet, loadSheetRoute, type LoadedSheet } from './load';

export interface SheetRequest {
  user: User | null;
  /** `?token=` of a private link. */
  token: string | undefined;
}

/** Two decimals: about 1.1 km north to south, 0.7 km east to west in Paris (Q1). */
const nearOf = ({ lat, lng }: { lat: number; lng: number }) => ({
  lat: Math.round(lat * 100) / 100,
  lng: Math.round(lng * 100) / 100,
});

/** The route the caller may read, its card and whether it is locked; else 404 or 410. */
async function readableRoute(db: Db, id: string, { user, token }: SheetRequest, now: Date) {
  const found = await loadSheetRoute(db, id);
  if (!found) throw httpError(404, 'Route not found');
  const access = sheetAccessOf(found.route, { userId: user?.id ?? null, token });
  if (access.kind === 'removed') {
    throw routeRemoved({
      // A route withdrawn before the column existed: its last update stands for the date.
      removedAt: (found.route.unpublishedAt ?? found.route.updatedAt).toISOString(),
      near: nearOf(found.route.startLocation ?? found.cityCenter),
    });
  }
  if (access.kind === 'not_found') throw httpError(404, 'Route not found');
  const loaded = await loadSheet(db, found);
  // A route without a step or not computed has no sheet: the same 404.
  if (!loaded.card) throw httpError(404, 'Route not found');
  const viewer = await routeViewerOf(db, user, [found.route]);
  return { loaded, access, card: toCard(loaded.card, viewer, now) };
}

/** Our estimates of the trips, in the mode the creator chose (D-088), as the planning stores. */
const estimatedTrips = (loaded: LoadedSheet, directions: DirectionsProvider | null = null) =>
  computeTransitions(
    loaded.steps.map(({ place, mode }) => ({ location: place.location, mode })),
    { directions, cache: null },
  );

/** Published routes of the author, or of Widoo for an official route; the certified badge. */
async function creatorOf(db: Db, route: LoadedSheet['route']): Promise<RouteDetail['creator']> {
  const published = sql<number>`count(*)::int`;
  const whose = route.isOfficial
    ? eq(routes.isOfficial, true)
    : route.authorId
      ? eq(routes.authorId, route.authorId)
      : undefined;
  if (!whose) return { routesPublished: 0, isCertified: false };
  const [[count], [author]] = await Promise.all([
    db
      .select({ value: published })
      .from(routes)
      .where(and(whose, eq(routes.status, 'published'))),
    route.authorId && !route.isOfficial
      ? db
          .select({ isCertified: users.isCertified, override: users.certifiedOverride })
          .from(users)
          .where(eq(users.id, route.authorId))
      : Promise.resolve([]),
  ]);
  return {
    routesPublished: count?.value ?? 0,
    isCertified: author ? isCertifiedWith(author.isCertified, author.override) : false,
  };
}

/** « Partagé par Camille »: the first name of the author of a route opened by its link. */
async function sharedByOf(db: Db, route: LoadedSheet['route']) {
  if (!route.authorId) return null;
  const [author] = await db
    .select({ firstName: users.firstName })
    .from(users)
    .where(eq(users.id, route.authorId));
  return author?.firstName ? { firstName: author.firstName } : null;
}

const isOnline = (status: RouteStatus) =>
  (onlineRouteStatuses as readonly RouteStatus[]).includes(status);

export interface SheetOptions {
  /** Mapbox Directions for the exact trips of this answer; null: our estimates only. */
  directions: DirectionsProvider | null;
  now?: Date;
}

/** The sheet of a route for the caller (`GET /routes/:id`). */
export async function readSheet(
  db: Db,
  id: string,
  request: SheetRequest,
  { directions, now = new Date() }: SheetOptions,
): Promise<RouteDetail> {
  const { loaded, access, card } = await readableRoute(db, id, request, now);
  const { route } = loaded;
  // Nothing is asked of Mapbox for steps the caller does not see (Q7).
  const trips: (Transition | null)[] = await estimatedTrips(
    loaded,
    card.isLocked ? null : directions,
  );
  const [reviews, creator, sharedBy, report] = await Promise.all([
    isOnline(route.status)
      ? listRouteRatings(db, route.id, { limit: 3 }).then((list) => list.items)
      : [],
    creatorOf(db, route),
    access.viaLink ? sharedByOf(db, route) : null,
    request.user ? runningRouteReport(db, route.id, request.user.id, now) : null,
  ]);
  return buildSheet(loaded, {
    card,
    trips,
    reviews,
    creator,
    sharedBy,
    myReport: report && { reportedAt: report.createdAt.toISOString(), status: report.status },
    now,
  });
}

/**
 * The timeline of a route for another start (`GET /routes/:id/timeline`), on our estimates, the
 * trips `POST /me/planned` freezes, without Mapbox (D-093); 402 for a Premium route locked to
 * the caller, who cannot plan it (Q7).
 */
export async function readTimeline(
  db: Db,
  id: string,
  request: SheetRequest,
  startsAt: Date,
): Promise<RouteTimeline> {
  const { loaded, card } = await readableRoute(db, id, request, new Date());
  if (card.isLocked) throw premiumRequired('premium_route');
  return routeTimelineOf(routeInputOf(loaded, await estimatedTrips(loaded)), startsAt);
}
