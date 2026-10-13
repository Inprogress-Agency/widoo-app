import type {
  Anecdotes,
  CertificationValues,
  FeaturedRoute,
  FeaturedRouteIds,
  ProfileAnecdote,
  ValidationIssue,
} from '@widoo/shared';
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { ratingOf } from '../db/route-stats';
import { anecdoteQuestions, routes, userAnecdotes, userFeaturedRoutes } from '../db/schema';

/** A rule of `PATCH /me` broken by the body, at the path of the offending field. */
export type ProfileIssue = Omit<ValidationIssue, 'location'>;

/** The anecdotes of a profile in display order, with the current label of each question. */
export async function readAnecdotes(db: Db, userId: string): Promise<ProfileAnecdote[]> {
  return db
    .select({
      questionKey: userAnecdotes.questionKey,
      questionLabel: anecdoteQuestions.label,
      answer: userAnecdotes.answer,
    })
    .from(userAnecdotes)
    .innerJoin(anecdoteQuestions, eq(anecdoteQuestions.key, userAnecdotes.questionKey))
    .where(eq(userAnecdotes.userId, userId))
    .orderBy(asc(userAnecdotes.position));
}

/**
 * The featured routes of a profile in display order. Joined on `published` and on the author
 * (D-023): a route that left `published`, or changed hands, is never shown, even while its row
 * waits for the status transition that deletes it.
 */
export async function readFeaturedRoutes(db: Db, userId: string): Promise<FeaturedRoute[]> {
  return db
    .select({ id: routes.id, title: routes.title })
    .from(userFeaturedRoutes)
    .innerJoin(
      routes,
      and(
        eq(routes.id, userFeaturedRoutes.routeId),
        eq(routes.status, 'published'),
        eq(routes.authorId, userFeaturedRoutes.userId),
      ),
    )
    .where(eq(userFeaturedRoutes.userId, userId))
    .orderBy(asc(userFeaturedRoutes.position));
}

/**
 * Questions an anecdote may answer: an active one, or one the user already answered, so that
 * saving the profile again keeps an answer to a question retired since. Locked until the end of
 * the transaction, so that a question is not retired between the check and the write.
 */
async function anecdoteIssues(tx: Tx, userId: string, anecdotes: Anecdotes) {
  if (anecdotes.length === 0) return [];
  const keys = anecdotes.map((anecdote) => anecdote.questionKey);
  const answered = tx
    .select({ key: userAnecdotes.questionKey })
    .from(userAnecdotes)
    .where(eq(userAnecdotes.userId, userId));
  const allowed = await tx
    .select({ key: anecdoteQuestions.key })
    .from(anecdoteQuestions)
    .where(
      and(
        inArray(anecdoteQuestions.key, keys),
        or(eq(anecdoteQuestions.isActive, true), inArray(anecdoteQuestions.key, answered)),
      ),
    )
    .for('share', { of: anecdoteQuestions });
  const allowedKeys = new Set(allowed.map((row) => row.key));
  return keys.flatMap((key, index): ProfileIssue[] =>
    allowedKeys.has(key)
      ? []
      : [
          {
            path: `anecdotes.${index}.questionKey`,
            code: 'inactive_question',
            message: 'Not an active question',
          },
        ],
  );
}

/**
 * Only published routes of the caller can be featured (D-023). Locked until the end of the
 * transaction, so that a route does not leave `published` between the check and the write.
 */
async function featuredRouteIssues(tx: Tx, userId: string, routeIds: FeaturedRouteIds) {
  if (routeIds.length === 0) return [];
  const featurable = await tx
    .select({ id: routes.id })
    .from(routes)
    .where(
      and(
        inArray(routes.id, routeIds),
        eq(routes.authorId, userId),
        eq(routes.status, 'published'),
      ),
    )
    .for('share');
  const featurableIds = new Set(featurable.map((row) => row.id));
  return routeIds.flatMap((routeId, index): ProfileIssue[] =>
    featurableIds.has(routeId)
      ? []
      : [
          {
            path: `featuredRouteIds.${index}`,
            code: 'not_featurable',
            message: 'Not a published route of yours',
          },
        ],
  );
}

/** Every broken rule of the anecdotes and featured routes of an update, in body order. */
export async function profileIssues(
  tx: Tx,
  userId: string,
  update: { anecdotes?: Anecdotes; featuredRouteIds?: FeaturedRouteIds },
): Promise<ProfileIssue[]> {
  return [
    ...(update.anecdotes ? await anecdoteIssues(tx, userId, update.anecdotes) : []),
    ...(update.featuredRouteIds
      ? await featuredRouteIssues(tx, userId, update.featuredRouteIds)
      : []),
  ];
}

/** Replaces the ordered lists of the update that are present; an empty list clears it. */
export async function replaceProfileLists(
  tx: Tx,
  userId: string,
  update: { anecdotes?: Anecdotes; featuredRouteIds?: FeaturedRouteIds },
): Promise<void> {
  const { anecdotes, featuredRouteIds } = update;
  if (anecdotes) {
    await tx.delete(userAnecdotes).where(eq(userAnecdotes.userId, userId));
    if (anecdotes.length > 0) {
      await tx
        .insert(userAnecdotes)
        .values(anecdotes.map((anecdote, index) => ({ userId, ...anecdote, position: index + 1 })));
    }
  }
  if (featuredRouteIds) {
    await tx.delete(userFeaturedRoutes).where(eq(userFeaturedRoutes.userId, userId));
    if (featuredRouteIds.length > 0) {
      await tx
        .insert(userFeaturedRoutes)
        .values(
          featuredRouteIds.map((routeId, index) => ({ userId, routeId, position: index + 1 })),
        );
    }
  }
}

/**
 * What the creator has on each criterion of the badge (D-023), over their published routes: the
 * routes whose places are all verified (the Vérifié badge of the search), and the average of
 * their ratings weighted by their count. No Go can be completed before the planned routes
 * exist (#40): until then, the completed routes are 0.
 */
export async function readCertificationValues(
  db: Db,
  userId: string,
): Promise<CertificationValues> {
  // `routes.id` written out: Drizzle leaves the columns of a single-table select unqualified.
  const rows = await db
    .select({
      stats: routes.stats,
      isVerified: sql<boolean>`coalesce((
        select bool_and(p.verification_status = 'verified')
        from steps s join places p on p.id = s.place_id
        where s.route_id = routes.id
      ), false)`,
    })
    .from(routes)
    .where(and(eq(routes.authorId, userId), eq(routes.status, 'published')));

  const ratings = rows
    .map((row) => ratingOf(row.stats))
    .flatMap(({ average, count }) => (average !== null && count > 0 ? [{ average, count }] : []));
  const ratingCount = ratings.reduce((total, rating) => total + rating.count, 0);
  const ratingSum = ratings.reduce((total, rating) => total + rating.average * rating.count, 0);
  return {
    verifiedRoutes: rows.filter((row) => row.isVerified).length,
    averageRating: ratingCount > 0 ? ratingSum / ratingCount : null,
    completedRoutes: 0,
  };
}
