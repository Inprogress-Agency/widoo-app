/**
 * Plannings of a user (wiki API › Favoris et programmation). Every read and write is scoped to
 * the owner: another user's planning is « not found », never « forbidden », so that its id
 * reveals nothing.
 */
import {
  PlannedRouteSnapshot,
  RouteTimeline,
  type PlannedRoute,
  type PlannedRouteStatus,
} from '@widoo/shared';
import { and, asc, eq, gt, inArray, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { Db, Tx } from '../db/client';
import { plannedRoutes, plannedSteps } from '../db/schema';
import { httpError } from '../errors';
import { timelineOf } from './snapshot';

export type PlannedRow = typeof plannedRoutes.$inferSelect;
type PlannedStepRow = typeof plannedSteps.$inferSelect;

const iso = (date: Date | null) => date?.toISOString() ?? null;

/** The answer of a planning: its snapshot, timeline, bookings and progress, in step order. */
export function toPlannedRoute(row: PlannedRow, stepRows: readonly PlannedStepRow[]): PlannedRoute {
  const route = PlannedRouteSnapshot.parse(row.routeRevisionSnapshot);
  const checked = new Set(row.checklist);
  const progress = new Map(stepRows.map((step) => [step.stepId, step]));
  return {
    id: row.id,
    routeId: row.routeId,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    completedAt: iso(row.completedAt),
    closedBy: row.closedBy,
    route,
    timeline: RouteTimeline.parse(row.timeline),
    checklist: route.steps
      .filter((step) => step.bookingRequired)
      .map((step) => ({ stepId: step.id, isChecked: checked.has(step.id) })),
    steps: route.steps.map((step) => {
      const done = progress.get(step.id);
      return {
        stepId: step.id,
        arrivedAt: iso(done?.arrivedAt ?? null),
        doneAt: iso(done?.doneAt ?? null),
        skippedAt: iso(done?.skippedAt ?? null),
      };
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const stepsOf = (db: Db | Tx, plannedRouteId: string) =>
  db
    .select()
    .from(plannedSteps)
    .where(eq(plannedSteps.plannedRouteId, plannedRouteId))
    .orderBy(asc(plannedSteps.position));

/** A planning with its progress rows. */
export async function readPlanned(db: Db | Tx, row: PlannedRow): Promise<PlannedRoute> {
  return toPlannedRoute(row, await stepsOf(db, row.id));
}

const ownedBy = (userId: string, id: string) =>
  and(eq(plannedRoutes.id, id), eq(plannedRoutes.userId, userId));

/** The planning `id` of `userId`, locked for the transaction when `tx` writes it; 404 otherwise. */
export async function ownedPlanned(db: Db | Tx, userId: string, id: string, forUpdate = false) {
  const query = db.select().from(plannedRoutes).where(ownedBy(userId, id));
  const [row] = forUpdate ? await query.for('update') : await query;
  if (!row) {
    throw httpError(404, 'Planned route not found');
  }
  return row;
}

/** The snapshot of a planning, as stored. */
export const snapshotOfRow = (row: PlannedRow) =>
  PlannedRouteSnapshot.parse(row.routeRevisionSnapshot);

/**
 * Plans the snapshot for `startsAt`: timeline and one progress row per step, in one transaction.
 * Checking the right to the route is the caller's.
 */
export async function createPlanned(
  db: Db,
  userId: string,
  snapshot: PlannedRouteSnapshot,
  startsAt: Date,
): Promise<PlannedRoute> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(plannedRoutes)
      .values({
        userId,
        routeId: snapshot.id,
        routeRevisionSnapshot: snapshot,
        startsAt,
        timeline: timelineOf(snapshot, startsAt),
      })
      .returning();
    if (!row) throw new Error('Planned route not inserted');
    await tx.insert(plannedSteps).values(
      snapshot.steps.map((step, position) => ({
        plannedRouteId: row.id,
        stepId: step.id,
        position,
      })),
    );
    return readPlanned(tx, row);
  });
}

/** Position of the last planning of a page: base64url JSON, a position and no right. */
const Cursor = z.strictObject({ startsAt: z.iso.datetime(), id: z.uuid() });

const encodeCursor = (row: PlannedRow) =>
  Buffer.from(JSON.stringify({ startsAt: row.startsAt.toISOString(), id: row.id })).toString(
    'base64url',
  );

function decodeCursor(cursor: string): z.infer<typeof Cursor> {
  try {
    return Cursor.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
  } catch {
    throw httpError(400, 'Invalid cursor');
  }
}

/** Plannings of `userId` by start, then id; one status or all. */
export async function listPlanned(
  db: Db,
  userId: string,
  query: { status?: PlannedRouteStatus; cursor?: string; limit: number },
): Promise<{ items: PlannedRoute[]; nextCursor: string | null }> {
  const conditions: (SQL | undefined)[] = [eq(plannedRoutes.userId, userId)];
  if (query.status) conditions.push(eq(plannedRoutes.status, query.status));
  if (query.cursor) {
    const after = decodeCursor(query.cursor);
    const startsAt = new Date(after.startsAt);
    conditions.push(
      or(
        gt(plannedRoutes.startsAt, startsAt),
        and(eq(plannedRoutes.startsAt, startsAt), gt(plannedRoutes.id, after.id)),
      ),
    );
  }
  const rows = await db
    .select()
    .from(plannedRoutes)
    .where(and(...conditions))
    .orderBy(asc(plannedRoutes.startsAt), asc(plannedRoutes.id))
    .limit(query.limit + 1);
  const page = rows.slice(0, query.limit);
  const stepRows =
    page.length === 0
      ? []
      : await db
          .select()
          .from(plannedSteps)
          .where(
            inArray(
              plannedSteps.plannedRouteId,
              page.map((row) => row.id),
            ),
          );
  const last = page.at(-1);
  return {
    items: page.map((row) =>
      toPlannedRoute(
        row,
        stepRows.filter((step) => step.plannedRouteId === row.id),
      ),
    ),
    nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
  };
}
