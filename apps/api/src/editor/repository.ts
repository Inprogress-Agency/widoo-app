/** Creation and editing of the caller's routes (wiki API › Création), each in one transaction. */
import { hasRole, type OwnRoute } from '@widoo/shared';
import { desc } from 'drizzle-orm';
import type { Db } from '../db/client';
import { cities, routes } from '../db/schema';
import type { User } from '../users/repository';
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
