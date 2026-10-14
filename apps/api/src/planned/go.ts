/**
 * The Go of a planning (Ecrans E-07): « Étape suivante » marks a step done, and « Itinéraire »
 * opens Google Maps on foot to the next step only, never the whole route (D-029, D-032).
 */
import type { LatLng, PlannedMapsUrl, PlannedRoute } from '@widoo/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { plannedSteps } from '../db/schema';
import { httpError } from '../errors';
import { ownedPlanned, readPlanned, snapshotOfRow } from './repository';

/** Google Maps URLs, on foot from where the phone is to `destination`. */
export function walkingMapsUrl(destination: LatLng): string {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('travelmode', 'walking');
  return url.href;
}

/** Marks a step of the caller's Go done, once: a skipped step becomes done. 409 outside a Go. */
export async function markStepDone(
  db: Db,
  userId: string,
  id: string,
  stepId: string,
  now: Date,
): Promise<PlannedRoute> {
  return db.transaction(async (tx) => {
    const row = await ownedPlanned(tx, userId, id, true);
    if (row.status !== 'in_progress') {
      throw httpError(409, 'The planned route is not in progress');
    }
    const ofStep = and(eq(plannedSteps.plannedRouteId, row.id), eq(plannedSteps.stepId, stepId));
    const [step] = await tx.select().from(plannedSteps).where(ofStep);
    if (!step) {
      throw httpError(404, 'Step not found');
    }
    if (!step.doneAt) {
      await tx.update(plannedSteps).set({ doneAt: now, skippedAt: null }).where(ofStep);
    }
    return readPlanned(tx, row);
  });
}

/** Google Maps to the first step neither done nor skipped; 409 when none is left. */
export async function nextStepMapsUrl(db: Db, userId: string, id: string): Promise<PlannedMapsUrl> {
  const row = await ownedPlanned(db, userId, id);
  const [next] = await db
    .select({ stepId: plannedSteps.stepId })
    .from(plannedSteps)
    .where(
      and(
        eq(plannedSteps.plannedRouteId, row.id),
        isNull(plannedSteps.doneAt),
        isNull(plannedSteps.skippedAt),
      ),
    )
    .orderBy(asc(plannedSteps.position))
    .limit(1);
  const step = snapshotOfRow(row).steps.find((candidate) => candidate.id === next?.stepId);
  if (!step) {
    throw httpError(409, 'No step left to go to');
  }
  return { stepId: step.id, url: walkingMapsUrl(step.place.location) };
}
