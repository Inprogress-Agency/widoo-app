/**
 * A route as its author edits it: the route row, locked, its open revision when it is published,
 * and the content the editor shows. Only the author reaches it: any other caller reads 404.
 */
import { evaluateRoute } from '@widoo/orchestration';
import { type OwnRoute, type RouteEvaluation } from '@widoo/shared';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { media, places, routes } from '../db/schema';
import { httpError } from '../errors';
import {
  openRevisionOf,
  routeContentOf,
  transitionsOf,
  type OpenRevision,
  type RouteContent,
} from './content';
import type { RouteRow } from './lifecycle';

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

type PlaceRow = Pick<
  typeof places.$inferSelect,
  'id' | 'name' | 'category' | 'location' | 'address' | 'cityId'
>;

/** The places of the steps by id; a missing id is absent from the map. */
export async function placesOf(tx: Tx, ids: readonly string[]): Promise<Map<string, PlaceRow>> {
  if (ids.length === 0) return new Map();
  const rows = await tx
    .select({
      id: places.id,
      name: places.name,
      category: places.category,
      location: places.location,
      address: places.address,
      cityId: places.cityId,
    })
    .from(places)
    .where(inArray(places.id, [...new Set(ids)]));
  return new Map(rows.map((row) => [row.id, row]));
}

/** Owners that have at least one photo: the route, its steps, their places. */
async function ownersWithPhoto(tx: Tx, routeId: string, content: RouteContent) {
  const stepIds = content.steps.map((step) => step.id);
  const placeIds = content.steps.map((step) => step.placeId);
  const rows = await tx
    .selectDistinct({ ownerId: media.ownerId })
    .from(media)
    .where(
      or(
        and(eq(media.ownerType, 'route'), eq(media.ownerId, routeId)),
        stepIds.length > 0
          ? and(eq(media.ownerType, 'step'), inArray(media.ownerId, stepIds))
          : undefined,
        placeIds.length > 0
          ? and(eq(media.ownerType, 'place'), inArray(media.ownerId, placeIds))
          : undefined,
      ),
    );
  return new Set(rows.map((row) => row.ownerId));
}

/** The content with its places, estimated trips and orchestration result at `now`. */
export async function evaluate(tx: Tx, routeId: string, content: RouteContent, now: Date) {
  const placeById = await placesOf(
    tx,
    content.steps.map((step) => step.placeId),
  );
  const locations = new Map([...placeById].map(([id, place]) => [id, place.location]));
  const [transitions, withPhoto] = await Promise.all([
    transitionsOf(content, locations),
    ownersWithPhoto(tx, routeId, content),
  ]);
  const evaluation: RouteEvaluation = evaluateRoute(
    {
      title: content.title || null,
      description: content.description,
      hasPhoto: withPhoto.has(routeId),
      steps: content.steps.map((step, index) => ({
        placeId: step.placeId,
        durationMin: step.durationMin,
        costPerPersonEur: step.costPerPersonEur,
        transition: transitions[index] ?? null,
        hasPhoto: withPhoto.has(step.id) || withPhoto.has(step.placeId),
      })),
    },
    now,
  );
  return { placeById, transitions, evaluation };
}

/** The orchestration result of the content, for the submission. */
export async function evaluationOf(tx: Tx, workspace: Workspace, now: Date) {
  return (await evaluate(tx, workspace.route.id, workspace.content, now)).evaluation;
}

/** The route as the editor shows it, with the orchestration result of its content. */
export async function ownRouteOf(tx: Tx, workspace: Workspace, now: Date): Promise<OwnRoute> {
  const { route, revision, content } = workspace;
  const { placeById, transitions, evaluation } = await evaluate(tx, route.id, content, now);
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
    ...evaluation,
  };
}
