/**
 * `PATCH /places/:id` (wiki API › Lieux): the creator of a place edits it as long as only their own
 * routes use it; a moderator, or an admin, always can.
 */
import { hasRole, type Place, type UpdatePlace } from '@widoo/shared';
import { and, eq, ne } from 'drizzle-orm';
import type { Db } from '../db/client';
import { placeHours, places, routes, steps } from '../db/schema';
import { httpError } from '../errors';
import { cityHolding, outsideAnyCity } from './create';
import { readPlace } from './read';

type Editor = { id: string; role: Parameters<typeof hasRole>[0] };

export async function updatePlace(
  db: Db,
  user: Editor,
  placeId: string,
  { hours, location, ...fields }: UpdatePlace,
): Promise<Place> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ createdBy: places.createdBy })
      .from(places)
      .where(eq(places.id, placeId))
      .for('update');
    if (!current) throw httpError(404, 'Place not found');

    if (!hasRole(user.role, 'moderator')) {
      if (current.createdBy !== user.id) throw httpError(403, 'Not the creator of this place');
      const [usedByOthers] = await tx
        .select({ routeId: steps.routeId })
        .from(steps)
        .innerJoin(routes, eq(routes.id, steps.routeId))
        .where(and(eq(steps.placeId, placeId), ne(routes.authorId, user.id)))
        .limit(1);
      if (usedByOthers) throw httpError(403, 'Used by the routes of others');
    }

    let cityId: string | undefined;
    if (location) {
      cityId = await cityHolding(tx, location);
      if (!cityId) throw outsideAnyCity();
    }
    const changes = { ...fields, ...(location ? { location, cityId } : {}) };
    if (Object.keys(changes).length > 0) {
      await tx
        .update(places)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(places.id, placeId));
    }
    if (hours) {
      await tx.delete(placeHours).where(eq(placeHours.placeId, placeId));
      if (hours.length > 0) {
        await tx.insert(placeHours).values(hours.map((slot) => ({ ...slot, placeId })));
      }
    }
    const place = await readPlace(tx, placeId);
    if (!place) throw new Error('Place not found after update');
    return place;
  });
}
