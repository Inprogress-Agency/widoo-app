/**
 * A route as its author edits it: the route row, locked, its open revision when it is published,
 * and the content the editor shows. Only the author reaches it: any other caller reads 404.
 */
import type { OwnRoute, RouteEvaluation } from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { routes } from '../db/schema';
import { httpError } from '../errors';
import { evaluationFrom } from './computed';
import { openRevisionOf, routeContentOf, type OpenRevision, type RouteContent } from './content';
import type { RouteRow } from './lifecycle';
import { recomputeRoute } from './recompute';

export type Workspace = { route: RouteRow; revision: OpenRevision | null; content: RouteContent };

/** The caller's route, locked until the end of the transaction; 404 for anyone else's. */
export async function ownedRoute(tx: Tx, userId: string, routeId: string): Promise<RouteRow> {
  const [route] = await tx
    .select()
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.authorId, userId)))
    .for('update');
  if (!route) throw httpError(404, 'Route not found');
  return route;
}

/** What the editor shows: the open revision of a published route, the route itself otherwise. */
export async function workspaceOf(tx: Tx, route: RouteRow): Promise<Workspace> {
  const revision = route.status === 'published' ? await openRevisionOf(tx, route.id) : null;
  return { route, revision, content: revision?.content ?? (await routeContentOf(tx, route)) };
}

/** The orchestration result of the content, for the submission. */
export async function evaluationOf(
  tx: Tx,
  workspace: Workspace,
  now: Date,
): Promise<RouteEvaluation> {
  return evaluationFrom((await recomputeRoute(tx, workspace.route, workspace.content, now)).result);
}

/** The route as the editor shows it, with the orchestration result of its content. */
export async function ownRouteOf(tx: Tx, workspace: Workspace, now: Date): Promise<OwnRoute> {
  const { route, revision, content } = workspace;
  const { placeById, transitions, result } = await recomputeRoute(tx, route, content, now);
  return {
    id: route.id,
    status: route.status,
    isOfficial: route.isOfficial,
    access: route.access,
    title: content.title || null,
    description: content.description,
    moods: content.moods,
    audiences: content.audiences,
    conditions: content.conditions,
    suggestedStart: content.suggestedStart,
    tips: content.tips,
    tipsHidden: content.tipsHidden,
    shareToken: route.shareToken,
    publishedAt: route.publishedAt?.toISOString() ?? null,
    updatedAt: route.updatedAt.toISOString(),
    revision: revision && { status: revision.status },
    steps: content.steps.map((step, position) => {
      const place = placeById.get(step.placeId);
      if (!place) throw new Error(`Place ${step.placeId} of a step was not loaded`);
      const trip = transitions[position] ?? null;
      return {
        id: step.id,
        placeId: step.placeId,
        title: step.title,
        description: step.description,
        highlights: step.highlights,
        durationMin: step.durationMin,
        costPerPersonEur: step.costPerPersonEur,
        bookingRequired: step.bookingRequired,
        bookingUrl: step.bookingUrl,
        bookingProvider: step.bookingProvider,
        bookingNote: step.bookingNote,
        bookingIsAffiliate: step.bookingIsAffiliate,
        endsOn: step.endsOn,
        transitionNote: step.transitionNote,
        position,
        place: {
          id: place.id,
          name: place.name,
          category: place.category,
          location: place.location,
          address: place.address,
        },
        transition: trip && {
          distanceM: trip.distanceM,
          durationMin: trip.durationMin,
          mode: trip.mode,
          estimated: trip.estimated,
        },
      };
    }),
    ...evaluationFrom(result),
  };
}
