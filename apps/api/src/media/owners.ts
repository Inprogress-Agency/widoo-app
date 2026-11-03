/**
 * Who may add or remove the photos of an owner (wiki API › Création, Securite-et-RGPD › contrôle
 * d'accès par ressource), and how many it holds. Every check locks what it reads until the end
 * of the transaction: two photos of the same owner never take the same rank.
 */
import {
  routeEditModeOf,
  routePhotosMax,
  stepPhotosMax,
  type UploadOwnerType,
} from '@widoo/shared';
import { and, count, eq, max } from 'drizzle-orm';
import type { Tx } from '../db/client';
import { media, routes, steps } from '../db/schema';
import { conflict, httpError } from '../errors';
import { lockEditablePlace, type PlaceEditor } from '../places/update';

/** Photos an owner holds, at most; none for a place, which the spec does not bound. */
const photosMaxOf: Record<UploadOwnerType, number | null> = {
  route: routePhotosMax,
  step: stepPhotosMax,
  place: null,
};

/**
 * Locks a route of `user` whose photos may change: 404 for the route of anyone else, as the
 * editor answers; 409 unless it is edited in place. A published route changes through its
 * revision, whose photos are its own (D-115, #434), never those of the version online.
 */
async function lockEditableRoute(tx: Tx, user: PlaceEditor, routeId: string) {
  const [route] = await tx
    .select({ status: routes.status })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.authorId, user.id)))
    .for('update');
  if (!route) throw httpError(404, 'Route not found');
  if (routeEditModeOf(route.status) !== 'in_place') {
    throw conflict(`The photos of a ${route.status} route cannot change`, {
      status: route.status,
    });
  }
}

/** The route of a step, read without a lock: the lock is taken on the route itself. */
async function routeOfStep(tx: Tx, stepId: string): Promise<string> {
  const [step] = await tx
    .select({ routeId: steps.routeId })
    .from(steps)
    .where(eq(steps.id, stepId));
  if (!step) throw httpError(404, 'Step not found');
  return step.routeId;
}

/**
 * Locks an owner whose photos `user` may change: the author of a route, for the route and its
 * steps, while it is edited in place; the editor of a place (`PATCH /places/:id`), for a place.
 */
export async function lockPhotoOwner(
  tx: Tx,
  user: PlaceEditor,
  ownerType: UploadOwnerType,
  ownerId: string,
): Promise<void> {
  if (ownerType === 'place') return lockEditablePlace(tx, user, ownerId);
  const routeId = ownerType === 'route' ? ownerId : await routeOfStep(tx, ownerId);
  await lockEditableRoute(tx, user, routeId);
  // A save of the editor may have removed the step meanwhile: read again under the lock.
  if (ownerType === 'step') await routeOfStep(tx, ownerId);
}

/**
 * The rank of the next photo of an owner, locked by `lockPhotoOwner`: after the last one. 409
 * when the owner holds its maximum, 5 for a step (D-029), 6 for a route (D-050).
 */
export async function nextPhotoPosition(
  tx: Tx,
  ownerType: UploadOwnerType,
  ownerId: string,
): Promise<number> {
  const [held] = await tx
    .select({ count: count(), last: max(media.position) })
    .from(media)
    .where(and(eq(media.ownerType, ownerType), eq(media.ownerId, ownerId)));
  const next = (held?.last ?? -1) + 1;
  const limit = photosMaxOf[ownerType];
  if (limit !== null && ((held?.count ?? 0) >= limit || next >= limit)) {
    throw conflict('The owner holds its maximum of photos', { reason: 'photos_full', limit });
  }
  return next;
}
