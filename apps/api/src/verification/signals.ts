/**
 * A confirmation or a report of a place by a visitor (wiki Creation-et-Moderation › Vérification
 * communautaire, API › Lieux, D-036, D-056, D-057): from an outing of their own, weighted by where
 * they were, counted once per place over 7 days, ignored after rejected reports; and its effect on
 * the place in the same transaction: verified again at the threshold of confirmations, flagged at
 * that of reports.
 */
import {
  afterConfirmation,
  areSignalsIgnored,
  daysBefore,
  flagsPlace,
  placeSignalDailyLimit,
  placeSignalWeightOf,
  PlannedRouteSnapshot,
  type PlaceSignalBody,
  type PlaceSignalContext,
  type SignalReason,
  type StepPlaceSignal,
  type VerificationRules,
  type VerificationStatus,
} from '@widoo/shared';
import { and, count, eq, gt, inArray, isNotNull, max, or, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { placeSignals, places, plannedRoutes, plannedSteps, users } from '../db/schema';
import { bodyValidationError, httpError } from '../errors';
import { didStepInCompletedGo } from './visits';

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

type LockedPlace = { status: VerificationStatus; verifiedAt: Date | null; confirmations: number };

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

/** Distinct accounts with an open report of `reason` since `since`, of a weight above zero. */
async function concordantAccounts(tx: Tx, placeId: string, reason: SignalReason, since: Date) {
  const [row] = await tx
    .select({ accounts: sql<number>`count(distinct ${placeSignals.userId})::int` })
    .from(placeSignals)
    .where(
      and(
        eq(placeSignals.placeId, placeId),
        eq(placeSignals.reason, reason),
        eq(placeSignals.status, 'open'),
        gt(placeSignals.weight, 0),
        gt(placeSignals.createdAt, since),
      ),
    );
  return row?.accounts ?? 0;
}

/** Whether the account did the step of the place in a Go it completed (`didStepInCompletedGo`). */
async function hasDoneStepInCompletedGo(tx: Tx, userId: string, placeId: string, now: Date) {
  const at = sql`${now.toISOString()}::timestamptz`;
  const [row] = await tx.execute<{ found: boolean }>(
    sql`select ${didStepInCompletedGo(userId, placeId, at)} as found`,
  );
  return row?.found === true;
}

/** A counted report: `flagged` at the threshold of Creation-et-Moderation › État d'un lieu. */
async function reportPlace(
  tx: Tx,
  { userId, placeId, signal }: NewPlaceSignal,
  place: LockedPlace,
  weight: number,
  rules: VerificationRules,
  now: Date,
) {
  const reason = signal.reason;
  if (!reason) throw new Error('A report without reason');
  // A verification after a report answers it: only the later reports agree with each other.
  const windowStart = daysBefore(now, rules.reportWindowDays);
  const since = place.verifiedAt && place.verifiedAt > windowStart ? place.verifiedAt : windowStart;
  const report = {
    reason,
    weight,
    concordantAccounts: await concordantAccounts(tx, placeId, reason, since),
    hasDoneStepInCompletedGo:
      reason === 'closed_permanently' && (await hasDoneStepInCompletedGo(tx, userId, placeId, now)),
  };
  if (flagsPlace(report, place.status, rules)) {
    await tx.update(places).set({ verificationStatus: 'flagged' }).where(eq(places.id, placeId));
  }
}

/** A counted confirmation: verified again at the threshold, `verified_at` now. */
async function confirmPlace(
  tx: Tx,
  placeId: string,
  place: LockedPlace,
  weight: number,
  rules: VerificationRules,
  now: Date,
) {
  const next = afterConfirmation(
    { status: place.status, confirmationsSinceVerified: place.confirmations },
    weight,
    rules,
  );
  if (!next) return;
  await tx
    .update(places)
    .set({
      verificationStatus: next.status,
      confirmationsSinceVerified: next.confirmationsSinceVerified,
      ...(next.isVerified && { verifiedAt: now }),
    })
    .where(eq(places.id, placeId));
}

/**
 * Records a signal whose outing the caller checked and locked, in its transaction. The locks
 * follow the order of every path that takes more than one of them: the outing, then the account,
 * so that two signals sent at once (the offline queue of the app sending again) wait for each
 * other, then the place, whose counters change. Another order would deadlock with « Étape
 * suivante » or the deletion of the account.
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
    .select({
      status: places.verificationStatus,
      verifiedAt: places.verifiedAt,
      confirmations: places.confirmationsSinceVerified,
    })
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
  if (input.signal.kind === 'confirm') {
    await confirmPlace(tx, input.placeId, place, weight, rules, now);
  } else {
    await reportPlace(tx, input, place, weight, rules, now);
  }
  return 'counted';
}

const invalidOuting = (message: string) =>
  bodyValidationError([{ path: 'plannedRouteId', code: 'invalid_value', message }]);

const notThroughPlace = 'The outing does not go through this place';

/**
 * Where the caller was, from their outing (D-056), locked first like in « Étape suivante »
 * (`recordPlaceSignal`): at the step of the place, reached (« J'y suis » or done), during the Go
 * (E-07) or after it (E-15). 422 for an outing of another account, that does not go through the
 * place, or completed without reaching it; 409 for an outing neither under way nor completed, or
 * a step not reached yet.
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
    .where(and(eq(plannedRoutes.id, plannedRouteId), eq(plannedRoutes.userId, userId)))
    .for('update');
  if (!outing) throw invalidOuting('Not an outing of the caller');
  const snapshot = PlannedRouteSnapshot.safeParse(outing.routeRevisionSnapshot).data;
  const stepIds = (snapshot?.steps ?? [])
    .filter((step) => step.place.id === placeId)
    .map((step) => step.id);
  if (stepIds.length === 0) throw invalidOuting(notThroughPlace);
  if (outing.status !== 'in_progress' && outing.status !== 'completed') {
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
  // Completed without reaching the place: the visitor was never there, as for a place elsewhere.
  if (outing.status === 'completed') {
    if (!reached) throw invalidOuting(notThroughPlace);
    return 'after_outing';
  }
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
