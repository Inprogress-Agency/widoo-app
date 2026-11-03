import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { placeSignals } from '../db/schema';
import { testConfig } from '../test-config';
import { signalFixtures } from '../verification/test-fixtures';

// Wiki Creation-et-Moderation › État d'un lieu, on copies of the demo route moved to fictitious
// places, one per case: shared database, parallel files. Everything is deleted afterwards.
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

const { visitor, route, outing, signal, placeOf } = fixtures;
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3_600_000);
const confirm = (plannedRouteId: string) => ({ kind: 'confirm', plannedRouteId });
const report = (plannedRouteId: string, reason: string) => ({
  kind: 'report',
  reason,
  plannedRouteId,
});

/** A visitor who completed an outing on the route: their headers and the outing. */
async function returned(routeId: string) {
  const { headers } = await visitor();
  return { headers, outingId: (await outing(headers, routeId, 'completed')).id };
}

describe('the effect of a confirmation on its place', () => {
  it('sets verified_at at 3 weighted confirmations, the counter back to zero', async () => {
    const { routeId, placeIds } = await route();
    const placeId = placeIds[0];
    const lastCheck = daysAgo(120);
    await placeOf(placeId, { verificationStatus: 'stale', verifiedAt: lastCheck });
    const onSite = await visitor();
    const go = await outing(onSite.headers, routeId, 'on_site');

    expect((await signal(onSite.headers, placeId, confirm(go.id))).statusCode).toBe(201);
    expect(await placeOf(placeId)).toMatchObject({
      verificationStatus: 'stale',
      verifiedAt: lastCheck,
      confirmationsSinceVerified: 2,
    });

    const after = await returned(routeId);
    expect((await signal(after.headers, placeId, confirm(after.outingId))).statusCode).toBe(201);
    const verified = await placeOf(placeId);
    expect(verified).toMatchObject({
      verificationStatus: 'verified',
      confirmationsSinceVerified: 0,
    });
    expect(verified.verifiedAt?.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('leaves a flagged place to the team', async () => {
    const { routeId, placeIds } = await route();
    const flagged = { verificationStatus: 'flagged' as const, verifiedAt: daysAgo(10) };
    await placeOf(placeIds[0], flagged);
    for (let index = 0; index < 2; index += 1) {
      const { headers, outingId } = await returned(routeId);
      expect((await signal(headers, placeIds[0], confirm(outingId))).statusCode).toBe(201);
    }
    expect(await placeOf(placeIds[0])).toMatchObject({ ...flagged, confirmationsSinceVerified: 0 });
  });
});

describe('the effect of a report on its place', () => {
  it('flags it at 2 accounts reporting the same reason', async () => {
    const { routeId, placeIds } = await route();
    await placeOf(placeIds[0], { verificationStatus: 'verified', verifiedAt: daysAgo(10) });
    const [first, second, third] = [
      await returned(routeId),
      await returned(routeId),
      await returned(routeId),
    ];

    await signal(first.headers, placeIds[0], report(first.outingId, 'closed_temporarily'));
    expect((await placeOf(placeIds[0])).verificationStatus).toBe('verified');
    // Another reason does not agree with it.
    await signal(second.headers, placeIds[0], report(second.outingId, 'wrong_hours'));
    expect((await placeOf(placeIds[0])).verificationStatus).toBe('verified');

    await signal(third.headers, placeIds[0], report(third.outingId, 'closed_temporarily'));
    expect((await placeOf(placeIds[0])).verificationStatus).toBe('flagged');
  });

  it('never flags it on field alerts, nor on reports answered by a later verification', async () => {
    const { routeId, placeIds } = await route();
    await placeOf(placeIds[0], { verificationStatus: 'verified', verifiedAt: daysAgo(10) });
    for (const reason of ['closed_today', 'works', 'crowded']) {
      for (let index = 0; index < 2; index += 1) {
        const { headers, outingId } = await returned(routeId);
        expect((await signal(headers, placeIds[0], report(outingId, reason))).statusCode).toBe(201);
      }
    }
    expect((await placeOf(placeIds[0])).verificationStatus).toBe('verified');

    const before = await returned(routeId);
    await signal(before.headers, placeIds[1], report(before.outingId, 'wrong_address'));
    await app.db
      .update(placeSignals)
      .set({ createdAt: daysAgo(3) })
      .where(eq(placeSignals.placeId, placeIds[1] ?? ''));
    await placeOf(placeIds[1], { verificationStatus: 'verified', verifiedAt: daysAgo(2) });
    const later = await returned(routeId);
    await signal(later.headers, placeIds[1], report(later.outingId, 'wrong_address'));
    expect((await placeOf(placeIds[1])).verificationStatus).toBe('verified');
  });

  it('flags it at one « closed_permanently » from an account that completed a Go there', async () => {
    const { routeId, placeIds } = await route();
    await placeOf(placeIds[0], { verificationStatus: 'verified', verifiedAt: daysAgo(10) });
    const onSite = await visitor();
    const go = await outing(onSite.headers, routeId, 'on_site');
    await signal(onSite.headers, placeIds[0], report(go.id, 'closed_permanently'));
    expect((await placeOf(placeIds[0])).verificationStatus).toBe('verified');

    await placeOf(placeIds[1], { verificationStatus: 'verified', verifiedAt: daysAgo(10) });
    const after = await returned(routeId);
    await signal(after.headers, placeIds[1], report(after.outingId, 'closed_permanently'));
    expect((await placeOf(placeIds[1])).verificationStatus).toBe('flagged');
  });
});
