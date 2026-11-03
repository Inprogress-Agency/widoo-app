/**
 * A confirmation or a report of a place by a visitor (wiki Creation-et-Moderation › Vérification
 * communautaire, API › Lieux, D-036, D-056, D-057): from an outing of their own, weighted by where
 * they were, counted once per place over 7 days, ignored after rejected reports.
 */
import {
  areSignalsIgnored,
  daysBefore,
  placeSignalDailyLimit,
  placeSignalWeightOf,
  PlannedRouteSnapshot,
  type PlaceSignalBody,
  type PlaceSignalContext,
  type StepPlaceSignal,
  type VerificationRules,
} from '@widoo/shared';
import { and, count, eq, gt, inArray, isNotNull, max, or } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { placeSignals, places, plannedRoutes, plannedSteps, users } from '../db/schema';
import { bodyValidationError, httpError } from '../errors';

/**
 * `counted`: written. Accepted without counting: `repeated` within 7 days (D-057), `ignored` after
 * rejected reports (never told), `limited` past the daily limit of the account.
 */
export type SignalOutcome = 'counted' | 'repeated' | 'ignored' | 'limited';

export interface NewPlaceSignal {
  userId: string;
  placeId: string;
  /** The outing of the visitor the signal comes from, checked by the caller (D-056). */
  plannedRouteId: string;
  context: PlaceSignalContext;
  signal: StepPlaceSignal;
}

async function hasSignalSince(tx: Tx, { userId, placeId }: NewPlaceSignal, since: Date) {
  const [found] = await tx
    .select({ id: placeSignals.id })
    .from(placeSignals)
    .where(
      and(
        eq(placeSignals.userId, userId),
        eq(placeSignals.placeId, placeId),
        gt(placeSignals.createdAt, since),
      ),
    )
    .limit(1);
  return found !== undefined;
}

async function rejectionsOf(tx: Tx, userId: string) {
  const [row] = await tx
    .select({ count: count(), lastAt: max(placeSignals.reviewedAt) })
    .from(placeSignals)
    .where(and(eq(placeSignals.userId, userId), eq(placeSignals.status, 'rejected')));
  return { count: row?.count ?? 0, lastAt: row?.lastAt ?? null };
}

async function signalsSince(tx: Tx, userId: string, since: Date) {
  const [row] = await tx
    .select({ count: count() })
    .from(placeSignals)
    .where(and(eq(placeSignals.userId, userId), gt(placeSignals.createdAt, since)));
  return row?.count ?? 0;
}

/**
 * Records a signal whose outing the caller checked, in its transaction: the account is locked
 * first, so that two signals sent at once (the offline queue of the app sending again) wait for
 * each other, then the place.
 */
export async function recordPlaceSignal(
  tx: Tx,
  input: NewPlaceSignal,
  rules: VerificationRules,
  now: Date,
): Promise<SignalOutcome> {
  const [user] = await tx
    .select({ createdAt: users.createdAt, trustScore: users.trustScore })
    .from(users)
    .where(eq(users.id, input.userId))
    .for('no key update');
  const [place] = await tx
    .select({ status: places.verificationStatus })
    .from(places)
    .where(eq(places.id, input.placeId))
    .for('update');
  if (!user || !place) throw httpError(404, 'Place not found');
  if (await hasSignalSince(tx, input, daysBefore(now, rules.signalIntervalDays))) {
    return 'repeated';
  }
  if (areSignalsIgnored(await rejectionsOf(tx, input.userId), now, rules)) return 'ignored';
  if ((await signalsSince(tx, input.userId, daysBefore(now, 1))) >= placeSignalDailyLimit) {
    return 'limited';
  }
  const weight = placeSignalWeightOf(
    { context: input.context, accountCreatedAt: user.createdAt, trustScore: user.trustScore },
    now,
    rules,
  );
  await tx.insert(placeSignals).values({
    placeId: input.placeId,
    userId: input.userId,
    kind: input.signal.kind,
    reason: input.signal.reason ?? null,
    comment: input.signal.comment ?? null,
    weight,
    contextPlannedRouteId: input.plannedRouteId,
    createdAt: now,
  });
  return 'counted';
}

const invalidOuting = (message: string) =>
  bodyValidationError([{ path: 'plannedRouteId', code: 'invalid_value', message }]);

/**
 * Where the caller was, from their outing (D-056): after a completed Go (E-15), or at the step of
 * the place during the Go, once arrived (E-07). 422 for an outing of another account or that does
 * not go through the place, 409 for an outing neither under way nor completed, or a step not
 * reached yet.
 */
async function contextOf(
  tx: Tx,
  userId: string,
  placeId: string,
  plannedRouteId: string,
): Promise<PlaceSignalContext> {
  const [outing] = await tx
    .select()
    .from(plannedRoutes)
    .where(and(eq(plannedRoutes.id, plannedRouteId), eq(plannedRoutes.userId, userId)));
  if (!outing) throw invalidOuting('Not an outing of the caller');
  const snapshot = PlannedRouteSnapshot.safeParse(outing.routeRevisionSnapshot).data;
  const stepIds = (snapshot?.steps ?? [])
    .filter((step) => step.place.id === placeId)
    .map((step) => step.id);
  if (stepIds.length === 0) throw invalidOuting('The outing does not go through this place');
  if (outing.status === 'completed') return 'after_outing';
  if (outing.status !== 'in_progress') {
    throw httpError(409, 'The outing is neither in progress nor completed');
  }
  const [reached] = await tx
    .select({ stepId: plannedSteps.stepId })
    .from(plannedSteps)
    .where(
      and(
        eq(plannedSteps.plannedRouteId, outing.id),
        inArray(plannedSteps.stepId, stepIds),
        or(isNotNull(plannedSteps.arrivedAt), isNotNull(plannedSteps.doneAt)),
      ),
    )
    .limit(1);
  if (!reached) throw httpError(409, 'The step of this place is not reached yet');
  return 'on_site';
}

/** `POST /places/:id/signals`: 404 for an unknown place, then the checks of the outing. */
export async function submitPlaceSignal(
  db: Db,
  userId: string,
  placeId: string,
  { plannedRouteId, ...signal }: PlaceSignalBody,
  rules: VerificationRules,
  now: Date,
): Promise<SignalOutcome> {
  return db.transaction(async (tx) => {
    const [place] = await tx.select({ id: places.id }).from(places).where(eq(places.id, placeId));
    if (!place) throw httpError(404, 'Place not found');
    const context = await contextOf(tx, userId, placeId, plannedRouteId);
    return recordPlaceSignal(tx, { userId, placeId, plannedRouteId, context, signal }, rules, now);
  });
}
