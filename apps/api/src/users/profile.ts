import type { Anecdotes, FeaturedRouteIds, ValidationIssue } from '@widoo/shared';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { anecdoteQuestions, routes, userAnecdotes, userFeaturedRoutes } from '../db/schema';

/** A rule of `PATCH /me` broken by the body, at the path of the offending field. */
export type ProfileIssue = Omit<ValidationIssue, 'location'>;

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
