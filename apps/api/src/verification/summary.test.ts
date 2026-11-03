import { defaultVerificationRules, type SignalReason } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { placeSignals } from '../db/schema';
import { testConfig } from '../test-config';
import { placeSignalSummaries } from './summary';
import { signalFixtures } from './test-fixtures';

// « Signalé fermé » of the sheet (wiki API › Fiche parcours, D-036), read at a given instant, on
// copies of the demo route moved to fictitious places of Paris: shared database, parallel files.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = signalFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier, directions: null });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

const { visitor, route, outing, patch, placeOf } = fixtures;
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3_600_000);

/**
 * A report of the place written as at `createdAt`, now by default, by a visitor back from the
 * route: every step done, or the first one reached only (« J'y suis »).
 */
async function reported(
  routeId: string,
  placeId: string | undefined,
  reason: SignalReason,
  {
    createdAt,
    weight = 1.5,
    visit = 'done',
  }: { createdAt?: Date; weight?: number; visit?: 'done' | 'arrived' } = {},
) {
  const { headers, id } = await visitor();
  const go = await outing(headers, routeId, visit === 'done' ? 'completed' : 'on_site');
  if (visit === 'arrived') await patch(headers, go.id, 'completed');
  await app.db.insert(placeSignals).values({
    placeId: placeId ?? '',
    userId: id,
    kind: 'report',
    reason,
    weight,
    contextPlannedRouteId: go.id,
    // After the outing, unless given.
    createdAt: createdAt ?? new Date(),
  });
}

const reportsOn = async (placeId: string | undefined, now = new Date()) => {
  const summaries = await placeSignalSummaries(app.db, [placeId ?? ''], {
    now,
    rules: defaultVerificationRules,
  });
  return summaries.get(placeId ?? '')?.reports ?? null;
};

describe('« Signalé fermé » of a place', () => {
  it('says « fermé aujourd’hui » until midnight in the city of the place, not in UTC', async () => {
    const { routeId, placeIds } = await route();
    // Tuesday 3 November 2026 at 22:30 in Paris, UTC+1.
    const closedAt = new Date('2026-11-03T21:30:00Z');
    await reported(routeId, placeIds[0], 'closed_today', { createdAt: closedAt });

    expect(await reportsOn(placeIds[0], new Date('2026-11-03T22:59:00Z'))).toEqual({
      count: 1,
      lastAt: closedAt.toISOString(),
    });
    // 00:01 in Paris, still the 3rd in UTC.
    expect(await reportsOn(placeIds[0], new Date('2026-11-03T23:01:00Z'))).toBeNull();
  });

  it('says nothing of a closure under the threshold, even on a place flagged for another reason', async () => {
    const { routeId, placeIds } = await route();
    await placeOf(placeIds[0], { verificationStatus: 'flagged', verifiedAt: null });
    await reported(routeId, placeIds[0], 'closed_temporarily', { createdAt: daysAgo(150) });
    // A second account, but more than 30 days after the first.
    await reported(routeId, placeIds[0], 'closed_temporarily');
    expect(await reportsOn(placeIds[0])).toBeNull();

    // A third one, 10 days ago: two accounts within 30 days, the three of them counted.
    await reported(routeId, placeIds[0], 'closed_temporarily', { createdAt: daysAgo(10) });
    expect((await reportsOn(placeIds[0]))?.count).toBe(3);
  });

  it('counts one « fermé définitivement » from an account that did the step in a completed Go', async () => {
    const { routeId, placeIds } = await route();
    for (const placeId of placeIds) {
      await placeOf(placeId, { verificationStatus: 'flagged', verifiedAt: daysAgo(20) });
    }
    await reported(routeId, placeIds[0], 'closed_permanently');
    // The step reached only; a report of no weight; a report sent before the Go was completed.
    await reported(routeId, placeIds[1], 'closed_permanently', { visit: 'arrived' });
    await reported(routeId, placeIds[2], 'closed_permanently', { weight: 0 });
    await reported(routeId, placeIds[3], 'closed_permanently', { createdAt: daysAgo(1) });

    expect((await reportsOn(placeIds[0]))?.count).toBe(1);
    for (const placeId of placeIds.slice(1, 4)) {
      expect(await reportsOn(placeId)).toBeNull();
    }
  });

  it('never counts a report of no weight', async () => {
    const { routeId, placeIds } = await route();
    await placeOf(placeIds[1], { verificationStatus: 'flagged', verifiedAt: null });
    await reported(routeId, placeIds[0], 'closed_today', { weight: 0 });
    await reported(routeId, placeIds[1], 'closed_temporarily');
    await reported(routeId, placeIds[1], 'closed_temporarily', { weight: 0 });

    expect(await reportsOn(placeIds[0])).toBeNull();
    expect(await reportsOn(placeIds[1])).toBeNull();
  });
});
