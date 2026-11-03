import { PlannedRoute } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { placeSignals } from '../db/schema';
import { testConfig } from '../test-config';
import { signalFixtures } from '../verification/test-fixtures';

// `{ signal }` of « Étape suivante » (wiki API › Favoris et programmation, D-095), on copies of the
// demo route moved to fictitious places: shared database, parallel files.
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

const { visitor, route, outing, signalsOn } = fixtures;
const done = (headers: Record<string, string>, id: string, stepId?: string, payload?: object) =>
  app.inject({
    method: 'POST',
    url: `/v1/me/planned/${id}/steps/${stepId}/done`,
    headers,
    ...(payload && { payload }),
  });

describe('POST /v1/me/planned/:id/steps/:stepId/done with the signal of the step', () => {
  it('marks the step done and records its signal on site, weighted 2', async () => {
    const { routeId, placeIds } = await route();
    const { headers, id } = await visitor();
    const go = await outing(headers, routeId, 'on_site');

    const confirmed = await done(headers, go.id, go.stepIds[0], { signal: { kind: 'confirm' } });
    // A step not marked arrived first: done, the visitor was there all the same.
    const signal = { kind: 'report', reason: 'other', comment: 'Fermé pour un tournage' };
    const reported = await done(headers, go.id, go.stepIds[1], { signal });

    expect(confirmed.statusCode, confirmed.body).toBe(200);
    expect(PlannedRoute.parse(reported.json()).steps.slice(0, 2)).toMatchObject([
      { doneAt: expect.any(String) },
      { doneAt: expect.any(String) },
    ]);
    expect(await signalsOn(placeIds[0])).toMatchObject([
      { userId: id, kind: 'confirm', weight: 2, contextPlannedRouteId: go.id },
    ]);
    expect(await signalsOn(placeIds[1])).toMatchObject([
      { kind: 'report', reason: 'other', comment: 'Fermé pour un tournage', weight: 2 },
    ]);
  });

  it('answers 200 to a signal sent again within 7 days, counted once (D-057)', async () => {
    const { routeId, placeIds } = await route();
    const { headers } = await visitor();
    const go = await outing(headers, routeId, 'on_site');
    const payload = { signal: { kind: 'confirm' } };

    expect((await done(headers, go.id, go.stepIds[0], payload)).statusCode).toBe(200);
    expect((await done(headers, go.id, go.stepIds[0], payload)).statusCode).toBe(200);

    expect(await signalsOn(placeIds[0])).toHaveLength(1);
  });

  it('marks the step done all the same past the daily limit, or for an ignored account', async () => {
    const { routeId, placeIds } = await route();
    const limited = await visitor();
    const limitedGo = await outing(limited.headers, routeId, 'on_site');
    const ignored = await visitor();
    const ignoredGo = await outing(ignored.headers, routeId, 'on_site');
    const elsewhere = { placeId: placeIds[3] ?? '', weight: 2 };
    await app.db.insert(placeSignals).values([
      ...Array.from({ length: 30 }, () => ({
        ...elsewhere,
        userId: limited.id,
        kind: 'confirm' as const,
        contextPlannedRouteId: limitedGo.id,
      })),
      // Three reports rejected by the team, the last one yesterday.
      ...Array.from({ length: 3 }, () => ({
        ...elsewhere,
        userId: ignored.id,
        kind: 'report' as const,
        reason: 'wrong_hours' as const,
        contextPlannedRouteId: ignoredGo.id,
        status: 'rejected' as const,
        reviewedAt: new Date(Date.now() - 24 * 3_600_000),
        createdAt: new Date(Date.now() - 20 * 24 * 3_600_000),
      })),
    ]);

    for (const [{ headers }, go] of [
      [limited, limitedGo],
      [ignored, ignoredGo],
    ] as const) {
      const response = await done(headers, go.id, go.stepIds[0], { signal: { kind: 'confirm' } });
      expect(response.statusCode, response.body).toBe(200);
      expect(PlannedRoute.parse(response.json()).steps[0]?.doneAt).toEqual(expect.any(String));
    }
    expect(await signalsOn(placeIds[0])).toEqual([]);
  });

  it('refuses a wrong signal with 422, the step left as it was', async () => {
    const { routeId, placeIds } = await route();
    const { headers } = await visitor();
    const go = await outing(headers, routeId, 'on_site');

    const response = await done(headers, go.id, go.stepIds[0], { signal: { kind: 'report' } });

    expect(response.statusCode).toBe(422);
    const planned = await app.inject({ url: `/v1/me/planned/${go.id}`, headers });
    expect(PlannedRoute.parse(planned.json()).steps[0]?.doneAt).toBeNull();
    expect(await signalsOn(placeIds[0])).toEqual([]);
  });
});
