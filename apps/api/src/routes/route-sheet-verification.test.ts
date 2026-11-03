import { RouteDetail, type RouteDetailStep } from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { placeSignals } from '../db/schema';
import { testConfig } from '../test-config';
import { signalFixtures } from '../verification/test-fixtures';

// `verification` of each step of GET /v1/routes/:id (wiki API › Fiche parcours, #49), on a copy
// of the demo route moved to fictitious places: shared database, parallel files.
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
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

/** A visitor back from an outing on the route sends one signal on the place. */
async function signals(routeId: string, placeId: string | undefined, body: object) {
  const { headers, id } = await visitor();
  const plannedRouteId = (await outing(headers, routeId, 'completed')).id;
  const response = await signal(headers, placeId, { ...body, plannedRouteId });
  expect(response.statusCode, response.body).toBe(201);
  return id;
}

const fullSteps = async (routeId: string) => {
  const response = await app.inject({ url: `/v1/routes/${routeId}` });
  expect(response.statusCode, response.body).toBe(200);
  return RouteDetail.parse(response.json()).steps as RouteDetailStep[];
};

describe('GET /v1/routes/:id and the signals of the visitors', () => {
  it('counts the visitors who confirmed, and those who report closed while it holds', async () => {
    const { routeId, placeIds } = await route();
    const [confirmed, closedToday, flagged, reported] = placeIds;
    for (const placeId of placeIds) {
      await placeOf(placeId, { verificationStatus: 'verified', verifiedAt: hoursAgo(240) });
    }
    await signals(routeId, confirmed, { kind: 'confirm' });
    await signals(routeId, confirmed, { kind: 'confirm' });
    await signals(routeId, closedToday, { kind: 'report', reason: 'closed_today' });
    // Closed yesterday: over at midnight.
    const yesterday = await signals(routeId, closedToday, {
      kind: 'report',
      reason: 'closed_today',
    });
    await app.db
      .update(placeSignals)
      .set({ createdAt: hoursAgo(30) })
      .where(and(eq(placeSignals.userId, yesterday), eq(placeSignals.placeId, closedToday ?? '')));
    await signals(routeId, flagged, { kind: 'report', reason: 'closed_temporarily' });
    await signals(routeId, flagged, { kind: 'report', reason: 'closed_permanently' });
    await signals(routeId, flagged, { kind: 'report', reason: 'closed_permanently' });
    await signals(routeId, reported, { kind: 'report', reason: 'closed_temporarily' });

    const steps = await fullSteps(routeId);

    const verifiedAt = (await placeOf(confirmed)).verifiedAt?.toISOString();
    expect(steps[0]?.verification).toEqual({
      confirmations: 2,
      lastConfirmedAt: verifiedAt,
      reports: null,
    });
    expect(steps[1]?.verification.reports).toEqual({ count: 1, lastAt: expect.any(String) });
    expect(steps[2]?.place.verificationStatus).toBe('flagged');
    expect(steps[2]?.verification.reports?.count).toBe(3);
    // One report alone does not flag the place: nothing said on the sheet.
    expect(steps[3]?.place.verificationStatus).toBe('verified');
    expect(steps[3]?.verification).toMatchObject({ confirmations: 0, reports: null });
  });

  it('forgets the closures answered by a verification of the team', async () => {
    const { routeId, placeIds } = await route();
    await placeOf(placeIds[0], { verificationStatus: 'verified', verifiedAt: hoursAgo(240) });
    await signals(routeId, placeIds[0], { kind: 'report', reason: 'closed_temporarily' });
    await signals(routeId, placeIds[0], { kind: 'report', reason: 'closed_temporarily' });
    expect((await fullSteps(routeId))[0]?.verification.reports?.count).toBe(2);

    await placeOf(placeIds[0], { verificationStatus: 'verified', verifiedAt: new Date() });

    expect((await fullSteps(routeId))[0]?.verification.reports).toBeNull();
  });
});
