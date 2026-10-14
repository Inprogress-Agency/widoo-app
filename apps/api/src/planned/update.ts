/**
 * `PATCH /me/planned/:id`: start, bookings and status of the caller's planning, in one
 * transaction on the locked row (Ecrans E-06, E-08; D-038).
 */
import type { PlannedRoute, UpdatePlannedRoute, ValidationIssue } from '@widoo/shared';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import { canAccessRoute, type RouteViewer } from '../access/route-access';
import type { Db } from '../db/client';
import { plannedRoutes } from '../db/schema';
import { bodyValidationError, httpError, premiumRequired } from '../errors';
import { ownedPlanned, readPlanned, snapshotOfRow, type PlannedRow } from './repository';
import { timelineOf } from './snapshot';
import { canMove, closingOf, isDatable } from './status';

/** The partial unique index of `planned_routes`: one Go in progress per user. */
const oneInProgress = 'planned_routes_one_in_progress_idx';

const isOneInProgressViolation = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  (error.cause as { code?: string; constraint_name?: string } | undefined)?.constraint_name ===
    oneInProgress;

/** The ticked bookings after the update; issues for a step that is not a booking of the route. */
function checklistOf(row: PlannedRow, items: UpdatePlannedRoute['checklist']) {
  const checked = new Set(row.checklist);
  if (!items) return { checklist: [...checked], issues: [] };
  const bookings = new Set(
    snapshotOfRow(row)
      .steps.filter((step) => step.bookingRequired)
      .map((step) => step.id),
  );
  const issues: Omit<ValidationIssue, 'location'>[] = [];
  items.forEach((item, index) => {
    if (!bookings.has(item.stepId)) {
      issues.push({
        path: `checklist.${index}.stepId`,
        code: 'invalid_value',
        message: 'Not a booking of this route',
      });
    } else if (item.isChecked) {
      checked.add(item.stepId);
    } else {
      checked.delete(item.stepId);
    }
  });
  return { checklist: [...checked], issues };
}

export async function updatePlanned(
  db: Db,
  viewer: RouteViewer & { id: string },
  id: string,
  body: UpdatePlannedRoute,
  now: Date,
): Promise<PlannedRoute> {
  try {
    return await db.transaction(async (tx) => {
      const row = await ownedPlanned(tx, viewer.id, id, true);
      const status = body.status ?? row.status;
      if (body.status && !canMove(row.status, body.status)) {
        throw httpError(409, `A ${row.status} planning cannot become ${body.status}`);
      }
      if (row.status === 'missed' && status === 'planned' && !body.startsAt) {
        throw bodyValidationError([
          {
            path: 'startsAt',
            code: 'invalid_type',
            message: 'A missed planning needs a new start',
          },
        ]);
      }
      if (body.startsAt && !isDatable(status)) {
        throw httpError(409, `The start of a ${status} planning cannot change`);
      }
      const { checklist, issues } = checklistOf(row, body.checklist);
      if (issues.length > 0) {
        throw bodyValidationError(issues);
      }
      // A Premium route without the right to it: neither a new date nor a new Go (D-038).
      const isStarting = body.status === 'in_progress' && row.status !== 'in_progress';
      const snapshot = snapshotOfRow(row);
      if ((body.startsAt || isStarting) && !canAccessRoute(snapshot, viewer, now)) {
        throw premiumRequired('premium_route');
      }
      const startsAt = body.startsAt ? new Date(body.startsAt) : row.startsAt;
      const [updated] = await tx
        .update(plannedRoutes)
        .set({
          status,
          startsAt,
          checklist,
          ...(body.startsAt && { timeline: timelineOf(snapshot, startsAt) }),
          ...(body.status && body.status !== row.status && closingOf(body.status, now)),
        })
        .where(eq(plannedRoutes.id, row.id))
        .returning();
      if (!updated) throw new Error('Planned route not updated');
      return readPlanned(tx, updated);
    });
  } catch (error) {
    if (isOneInProgressViolation(error)) {
      throw httpError(409, 'Another planned route is in progress');
    }
    throw error;
  }
}
