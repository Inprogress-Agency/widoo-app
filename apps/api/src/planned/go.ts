/**
 * The Go of a planning (Ecrans E-07): « J'y suis » and « Étape suivante » mark a step arrived or
 * done, « Passer cette étape » skips it, and « Itinéraire » opens Google Maps to the next step, in
 * the mode of the trip that leads to it, never the whole route (D-029, D-032, D-033, #510).
 */
import { stepMapsUrl } from '@widoo/orchestration';
import type { PlannedMapsUrl, PlannedRoute } from '@widoo/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { plannedSteps } from '../db/schema';
import { httpError } from '../errors';
import { ownedPlanned, readPlanned, snapshotOfRow } from './repository';

/** New values of a step of the Go, or nothing to leave it as it was. */
type StepChange = Partial<typeof plannedSteps.$inferInsert> | null;

/**
 * Changes one step of the caller's Go under lock: loads its planning `in_progress` (409 outside a
 * Go, 404 for another user's planning) and its step (404 when unknown), applies `change` to it and
 * answers the updated `PlannedRoute`. Idempotent: `change` returns nothing once the step is
 * already in the asked state, keeping its first time.
 */
async function changeStepOfGo(
  db: Db,
  userId: string,
  id: string,
  stepId: string,
  change: (step: typeof plannedSteps.$inferSelect) => StepChange,
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
    const set = change(step);
    if (set) {
      await tx.update(plannedSteps).set(set).where(ofStep);
    }
    return readPlanned(tx, row);
  });
}

/** Marks a step of the caller's Go done, once: a skipped step becomes done. 409 outside a Go. */
export async function markStepDone(
  db: Db,
  userId: string,
  id: string,
  stepId: string,
  now: Date,
): Promise<PlannedRoute> {
  return changeStepOfGo(db, userId, id, stepId, (step) =>
    step.doneAt ? null : { doneAt: now, skippedAt: null },
  );
}

/** Marks a step of the caller's Go arrived (« J'y suis »), once. 409 outside a Go. */
export function markStepArrived(
  db: Db,
  userId: string,
  id: string,
  stepId: string,
  now: Date,
): Promise<PlannedRoute> {
  return changeStepOfGo(db, userId, id, stepId, (step) =>
    step.arrivedAt ? null : { arrivedAt: now },
  );
}

/** Skips a step of the caller's Go (« Passer cette étape »), once; 409 once it is done. */
export function skipStep(
  db: Db,
  userId: string,
  id: string,
  stepId: string,
  now: Date,
): Promise<PlannedRoute> {
  return changeStepOfGo(db, userId, id, stepId, (step) => {
    if (step.doneAt) {
      throw httpError(409, 'The step is already done');
    }
    return step.skippedAt ? null : { skippedAt: now };
  });
}

/** Skips a step of the caller's Go no more (« Annuler »), keeping its arrival. Idempotent. */
export function unskipStep(db: Db, userId: string, id: string, stepId: string): Promise<PlannedRoute> {
  return changeStepOfGo(db, userId, id, stepId, (step) =>
    step.skippedAt ? { skippedAt: null } : null,
  );
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
  const steps = snapshotOfRow(row).steps;
  const index = steps.findIndex((candidate) => candidate.id === next?.stepId);
  const step = index === -1 ? undefined : steps[index];
  if (!step) {
    throw httpError(409, 'No step left to go to');
  }
  return { stepId: step.id, url: stepMapsUrl(steps, index) };
}
