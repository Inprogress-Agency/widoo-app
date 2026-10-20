/** Creation and editing of the caller's routes (wiki API › Création), each in one transaction. */
import {
  hasRole,
  type OwnRoute,
  type PutRouteSteps,
  type UpdateRoute,
  type ValidationIssue,
} from '@widoo/shared';
import { desc } from 'drizzle-orm';
import type { Db } from '../db/client';
import { cities, routes } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { bodyValidationError } from '../errors';
import type { User } from '../users/repository';
import type { RouteContent } from './content';
import { placesOf } from './recompute';
import { saveContent } from './save';
import { ownedRoute, ownRouteOf, workspaceOf } from './workspace';

/**
 * A draft of the caller, without steps. Its city is the active one until the first step gives
 * its own (D-085). A route of an `editor` is « Par Widoo » (wiki Creation-et-Moderation).
 */
export async function createRoute(
  db: Db,
  user: User,
  title: string | undefined,
  now: Date,
): Promise<OwnRoute> {
  return db.transaction(async (tx) => {
    const [city] = await tx
      .select({ id: cities.id })
      .from(cities)
      .orderBy(desc(cities.isActive), cities.slug)
      .limit(1);
    if (!city) throw new Error('No city to create a route in');
    const [route] = await tx
      .insert(routes)
      .values({
        cityId: city.id,
        authorId: user.id,
        isOfficial: hasRole(user.role, 'editor'),
        title: title ?? '',
      })
      .returning();
    if (!route) throw new Error('Route not created');
    return ownRouteOf(tx, await workspaceOf(tx, route), now);
  });
}

/** One route of the caller as the editor shows it. */
export async function readOwnRoute(db: Db, userId: string, routeId: string, now: Date) {
  return db.transaction(async (tx) =>
    ownRouteOf(tx, await workspaceOf(tx, await ownedRoute(tx, userId, routeId)), now),
  );
}

/** `PATCH /routes/:id`: the fields given replace the content's. */
export async function updateRoute(
  db: Db,
  userId: string,
  routeId: string,
  update: UpdateRoute,
  now: Date,
): Promise<OwnRoute> {
  return db.transaction(async (tx) => {
    const workspace = await workspaceOf(tx, await ownedRoute(tx, userId, routeId));
    const content: RouteContent = { ...workspace.content, ...update };
    return ownRouteOf(tx, await saveContent(tx, workspace, content, now), now);
  });
}

/**
 * `PUT /routes/:id/steps`: the ordered list replaces the content's. A step with an `id` keeps it,
 * and its photos; that id must be one of the route's, and every place must exist (422).
 */
export async function putRouteSteps(
  db: Db,
  userId: string,
  routeId: string,
  body: PutRouteSteps,
  now: Date,
): Promise<OwnRoute> {
  return db.transaction(async (tx) => {
    const workspace = await workspaceOf(tx, await ownedRoute(tx, userId, routeId));
    const knownIds = new Set(workspace.content.steps.map((step) => step.id));
    const placeById = await placesOf(
      tx,
      body.steps.map((step) => step.placeId),
    );
    const issues = body.steps.flatMap((step, index): Omit<ValidationIssue, 'location'>[] => [
      ...(step.id && !knownIds.has(step.id)
        ? [{ path: `steps.${index}.id`, code: 'unknown_step', message: 'Not a step of this route' }]
        : []),
      ...(placeById.has(step.placeId)
        ? []
        : [{ path: `steps.${index}.placeId`, code: 'unknown_place', message: 'Place not found' }]),
    ]);
    if (issues.length > 0) throw bodyValidationError(issues);
    const content: RouteContent = {
      ...workspace.content,
      steps: body.steps.map((step) => ({ ...step, id: step.id ?? uuidv7() })),
    };
    return ownRouteOf(tx, await saveContent(tx, workspace, content, now), now);
  });
}
