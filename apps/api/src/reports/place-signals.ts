import {
  adminSignalsPageSize,
  type AdminSignaledPlaces,
  type AdminSignalsQuery,
  type PlaceActionResult,
  type PlaceAlreadyDecidedDetails,
} from '@widoo/shared';
import { and, eq, exists, sql } from 'drizzle-orm';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import { recordAdminAction } from '../admin/actions';
import type { Db } from '../db/client';
import { moderationActionsTable, places, routes, steps } from '../db/schema';
import { moveRoute } from '../editor/lifecycle';
import { httpError } from '../errors';

type PlaceRow = {
  id: string;
  name: string;
  address: string;
  city_name: string;
  verification_status: AdminSignaledPlaces['items'][number]['verificationStatus'];
  verified_at: Date | null;
  confirmations: number;
  routes: AdminSignaledPlaces['items'][number]['routes'];
};

// The signals of a place are not stored yet (`place_signals`, ticket #49): while no table holds
// them, none is open. One expression to replace when the table exists.
const openSignalCount = 0;

/**
 * The places the community flagged (A-03), the least recently verified first, with the published
 * routes that go through each. Without the signals table, the list holds the places whose status
 * is `flagged`, each with no signal counted.
 */
export async function readSignaledPlaces(
  db: Db,
  query: AdminSignalsQuery,
): Promise<AdminSignaledPlaces> {
  const offset = offsetOfCursor(query.cursor);
  const from = sql`from places p join cities c on c.id = p.city_id
    where p.verification_status = 'flagged'`;
  const rows = await db.execute<PlaceRow>(sql`
    select p.id, p.name, p.address, c.name as city_name, p.verification_status, p.verified_at,
      p.confirmations_since_verified::float as confirmations,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'status', r.status)
          order by r.title)
        from routes r
        where r.status = 'published'
          and exists (select 1 from steps s where s.route_id = r.id and s.place_id = p.id)
      ), '[]'::jsonb) as routes
    ${from}
    order by p.verified_at asc nulls first, p.id
    limit ${adminSignalsPageSize} offset ${offset}`);
  const [counted] = await db.execute<{ total: number }>(sql`select count(*)::int as total ${from}`);
  const total = counted?.total ?? 0;
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      cityName: row.city_name,
      verificationStatus: row.verification_status,
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
      signalCount: openSignalCount,
      confirmationCount: row.confirmations,
      routes: row.routes,
    })),
    total,
    offset,
    ...neighbourCursors(offset, total, adminSignalsPageSize),
  };
}

type PlaceActionInput = {
  placeId: string;
  /** The member of the team who acts. */
  actorId: string;
};

function alreadyIs(status: PlaceActionResult['verificationStatus']) {
  const details: PlaceAlreadyDecidedDetails = { status };
  return httpError(409, `Place is already ${status}`, 'already_decided', details);
}

/**
 * Marks a place verified by the team (A-03): the confirmations count from zero again. A place
 * that is already verified answers 409 `already_decided`.
 */
export async function verifyPlace(
  db: Db,
  input: PlaceActionInput,
  now = new Date(),
): Promise<PlaceActionResult> {
  return db.transaction(async (tx) => {
    const [place] = await tx
      .select({ status: places.verificationStatus })
      .from(places)
      .where(eq(places.id, input.placeId))
      .for('update');
    if (!place) {
      throw httpError(404, 'Place not found');
    }
    if (place.status === 'verified') {
      throw alreadyIs(place.status);
    }
    await tx
      .update(places)
      .set({ verificationStatus: 'verified', verifiedAt: now, confirmationsSinceVerified: 0 })
      .where(eq(places.id, input.placeId));
    await recordAdminAction(tx, {
      actorId: input.actorId,
      action: 'place.verify',
      targetType: 'place',
      targetId: input.placeId,
      before: { status: place.status },
      after: { status: 'verified' },
    });
    return { placeId: input.placeId, verificationStatus: 'verified', routesToFix: 0 };
  });
}

/**
 * Closes a place (A-03): its status becomes `closed`, and the published routes that go through it
 * become `needs_fix` by `moveRoute`, a decision of the team, each with a line in its history. The reason is required. A place that is
 * already closed answers 409 `already_decided`.
 */
export async function closePlace(
  db: Db,
  input: PlaceActionInput & { reason: string },
  now = new Date(),
): Promise<PlaceActionResult> {
  return db.transaction(async (tx) => {
    const [place] = await tx
      .select({ status: places.verificationStatus, name: places.name })
      .from(places)
      .where(eq(places.id, input.placeId))
      .for('update');
    if (!place) {
      throw httpError(404, 'Place not found');
    }
    if (place.status === 'closed') {
      throw alreadyIs(place.status);
    }
    await tx
      .update(places)
      .set({ verificationStatus: 'closed' })
      .where(eq(places.id, input.placeId));

    const concerned = await tx
      .select()
      .from(routes)
      .where(
        and(
          eq(routes.status, 'published'),
          exists(
            tx
              .select({ id: steps.id })
              .from(steps)
              .where(and(eq(steps.routeId, routes.id), eq(steps.placeId, input.placeId))),
          ),
        ),
      )
      .orderBy(routes.id)
      .for('update');
    const routeIds = concerned.map((route) => route.id);
    // A decision of the team, like « Demander des modifications » on a published route (A-02).
    for (const route of concerned) {
      await moveRoute(tx, route, 'needs_fix', 'moderator', now);
    }
    if (routeIds.length > 0) {
      await tx.insert(moderationActionsTable).values(
        routeIds.map((routeId) => ({
          routeId,
          actorId: input.actorId,
          action: 'request_changes' as const,
          message: `Lieu fermé : ${place.name}. ${input.reason}`,
        })),
      );
    }
    await recordAdminAction(tx, {
      actorId: input.actorId,
      action: 'place.close',
      targetType: 'place',
      targetId: input.placeId,
      before: { status: place.status },
      after: { status: 'closed', routesToFix: routeIds },
      reason: input.reason,
    });
    return {
      placeId: input.placeId,
      verificationStatus: 'closed',
      routesToFix: routeIds.length,
    };
  });
}
