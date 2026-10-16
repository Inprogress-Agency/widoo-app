/** What a visitor reads of a creator (E-16, wiki API › Découverte): `GET /users/:id/profile`. */
import {
  certificationCriteriaOf,
  isCertifiedWith,
  taxonomies,
  type CertificationThresholds,
  type Mood,
  type ProfileRouteSort,
  type PublicProfile,
  type PublicProfileQueryParams,
  type RouteCard,
} from '@widoo/shared';
import { and, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
import { routeViewerOf } from '../access/route-viewer';
import type { Db } from '../db/client';
import { routes, users } from '../db/schema';
import { activeFilters, allOf, listedRoutes } from '../search/filters';
import {
  cardColumns,
  cardJoins,
  httpsOrNull,
  readCardPage,
  toCard,
  type CardRow,
} from '../search/repository';
import { sortKeys, type SortKey } from '../search/sort';
import { readAnecdotes, readCertificationValues } from './profile';
import type { User } from './repository';

/**
 * The account of a public profile: active, not suspended, public and with a first name, as the author of a card
 * (D-025). A masked profile, a deleted account and an unknown id are all `undefined`, so that the
 * answer never tells them apart.
 */
async function findPublicUser(db: Db, id: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, id),
        isNull(users.deletedAt),
        // A suspended account is masked; its published routes stay (A-06).
        isNull(users.suspendedAt),
        eq(users.isPublic, true),
        isNotNull(users.firstName),
      ),
    );
  return user;
}

/** The listed routes of the creator: published, with a card (no draft, private or withdrawn). */
const routesOf = (userId: string): SQL =>
  allOf([sql`${routes.authorId} = ${userId}`, listedRoutes()]);

/**
 * Sort keys of « Tous ses parcours »: the most recently published first, or the search sorts by
 * rating and duration; the route id last to break ties.
 */
function profileSortKeys(sort: ProfileRouteSort): SortKey[] {
  if (sort !== 'recent') return sortKeys(sort, undefined);
  return [
    {
      // Microseconds, the precision of a timestamp: two routes never compare equal by rounding.
      expr: sql`(extract(epoch from coalesce(${routes.publishedAt}, ${routes.createdAt})) * 1000000)::bigint`,
      direction: 'desc',
      type: 'bigint',
    },
    { expr: sql`${routes.id}`, direction: 'desc', type: 'uuid' },
  ];
}

/** The featured routes the creator chose, in their order, among their listed routes. */
async function readFeaturedCards(db: Db, userId: string, user: User | null): Promise<RouteCard[]> {
  const rows = await db.execute<CardRow>(sql`
    select r.id, ${cardColumns}
    from user_featured_routes f
    join routes r on r.id = f.route_id
    ${cardJoins}
    where f.user_id = ${userId}
      and r.id in (select ${routes.id} from ${routes} where ${routesOf(userId)})
    order by f.position
  `);
  const viewer = await routeViewerOf(db, user, rows);
  const now = new Date();
  return rows.map((row) => toCard(row, viewer, now));
}

/** Listed routes of the creator by mood, a route counted under each of its moods. */
async function readMoodCounts(db: Db, userId: string): Promise<PublicProfile['moodCounts']> {
  const rows = await db.execute<{ mood: string; count: number }>(sql`
    select m.mood, count(*)::int as count
    from ${routes}, unnest(${routes.moods}) as m(mood)
    where ${routesOf(userId)}
    group by m.mood
  `);
  const moods: readonly string[] = taxonomies.moods;
  return Object.fromEntries(
    rows.flatMap((row) => (moods.includes(row.mood) ? [[row.mood as Mood, row.count]] : [])),
  );
}

async function countListedRoutes(db: Db, userId: string): Promise<number> {
  const [row] = await db.execute<{ count: number }>(
    sql`select count(*)::int as count from ${routes} where ${routesOf(userId)}`,
  );
  return row?.count ?? 0;
}

/**
 * The public profile of `id` for a caller, anonymous when null, its listed routes sorted,
 * filtered and paged by the query; `undefined` when there is none to show (404). Each figure is
 * null when it does not exist (E-16 shows only those): no published route, no rating.
 * `routesCompleted` stays null until the completed Gos on their routes are counted (#423,
 * D-091). `verifiedPlaces` is null at zero (D-056), and zero while no place signal is stored.
 */
export async function readPublicProfile(
  db: Db,
  id: string,
  query: PublicProfileQueryParams,
  caller: User | null,
  thresholds: CertificationThresholds,
): Promise<PublicProfile | undefined> {
  const user = await findPublicUser(db, id);
  if (!user?.firstName) return undefined;

  const filters = Object.values(activeFilters({ moods: query.moods }));
  const [anecdotes, values, featuredRoutes, page, moodCounts, published] = await Promise.all([
    readAnecdotes(db, user.id),
    readCertificationValues(db, user.id),
    readFeaturedCards(db, user.id, caller),
    readCardPage(
      db,
      {
        where: allOf([routesOf(user.id), ...filters]),
        sort: `profile:${query.sort}`,
        keys: profileSortKeys(query.sort),
        cursor: query.cursor,
        limit: query.limit,
      },
      caller,
    ),
    readMoodCounts(db, user.id),
    countListedRoutes(db, user.id),
  ]);
  return {
    id: user.id,
    firstName: user.firstName,
    avatarUrl: httpsOrNull(user.avatarUrl),
    createdAt: user.createdAt.toISOString(),
    neighborhood: user.neighborhood,
    bio: user.bio,
    certified: isCertifiedWith(user.isCertified, user.certifiedOverride),
    certification: { criteria: certificationCriteriaOf(values, thresholds) },
    routesPublished: published > 0 ? published : null,
    routesCompleted: null,
    ratingAvg: values.averageRating,
    verifiedPlaces: null,
    anecdotes,
    featuredRoutes,
    routes: page,
    moodCounts,
  };
}
