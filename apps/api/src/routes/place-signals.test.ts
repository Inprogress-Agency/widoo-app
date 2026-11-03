import { ApiError, PlaceSignalReceipt } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { placeSignals } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';
import { signalFixtures } from '../verification/test-fixtures';

// On copies of the demo route moved to fictitious places, one per case: shared database,
// parallel files. Fictitious accounts are deleted afterwards with their outings and signals.
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

const { visitor, route, outing, patch, signal, signalsOn } = fixtures;
const confirm = (plannedRouteId: string) => ({ kind: 'confirm', plannedRouteId });
const report = (plannedRouteId: string, reason: string, comment?: string) => ({
  kind: 'report',
  reason,
  plannedRouteId,
  ...(comment && { comment }),
});
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3_600_000);

describe('POST /v1/places/:id/signals', () => {
  it('writes a confirmation on site, weighted 2, and answers 201 with its receipt', async () => {
    const { routeId, placeIds } = await route();
    const { headers, id } = await visitor();
    const go = await outing(headers, routeId, 'on_site');

    const response = await signal(headers, placeIds[0], confirm(go.id));

    expect(response.statusCode, response.body).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    const receipt = PlaceSignalReceipt.parse(response.json());
    expect(receipt).toMatchObject({
      placeId: placeIds[0],
      kind: 'confirm',
      reason: null,
      isCounted: true,
    });
    expect(await signalsOn(placeIds[0])).toMatchObject([
      { userId: id, kind: 'confirm', weight: 2, status: 'open', contextPlannedRouteId: go.id },
    ]);
  });

  it('answers 409 before the step is reached, or for an outing neither under way nor completed', async () => {
    const { routeId, placeIds } = await route();
    const { headers } = await visitor();
    const plannedOnly = await outing(headers, routeId, 'planned');
    expect((await signal(headers, placeIds[0], confirm(plannedOnly.id))).statusCode).toBe(409);

    const go = await outing(headers, routeId, 'on_site');
    // At the first step, not yet at the second one.
    expect((await signal(headers, placeIds[1], confirm(go.id))).statusCode).toBe(409);
    await patch(headers, go.id, 'stopped');
    const stopped = await signal(headers, placeIds[0], confirm(go.id));
    expect(stopped.statusCode).toBe(409);
    expect(ApiError.parse(stopped.json()).code).toBe('conflict');
    expect(await signalsOn(placeIds[0])).toEqual([]);
  });

  it('refuses an outing of another account or elsewhere, an unknown place and a wrong body', async () => {
    const { routeId, placeIds } = await route();
    const elsewhere = await route();
    const reader = await visitor();
    const other = await visitor();
    const done = await outing(reader.headers, routeId, 'completed');

    const foreign = await signal(other.headers, placeIds[0], confirm(done.id));
    expect(foreign.statusCode).toBe(422);
    expect(ApiError.parse(foreign.json()).details?.issues).toMatchObject([
      { location: 'body', path: 'plannedRouteId' },
    ]);
    expect((await signal(reader.headers, elsewhere.placeIds[0], confirm(done.id))).statusCode).toBe(
      422,
    );
    expect((await signal(reader.headers, uuidv7(), confirm(done.id))).statusCode).toBe(404);
    const withoutReason = { kind: 'report', plannedRouteId: done.id };
    expect((await signal(reader.headers, placeIds[0], withoutReason)).statusCode).toBe(422);
    expect((await signal({}, placeIds[0], confirm(done.id))).statusCode).toBe(401);
    expect(await signalsOn(placeIds[0])).toEqual([]);
  });
});

describe('POST /v1/places/:id/signals against abuse (Creation-et-Moderation › Anti-abus)', () => {
  it('weighs a signal after the outing 1.5, and 0.5 from an account younger than a day', async () => {
    const { routeId, placeIds } = await route();
    const reader = await visitor();
    const done = await outing(reader.headers, routeId, 'completed');
    const young = await visitor(new Date());
    const youngDone = await outing(young.headers, routeId, 'completed');

    const reported = await signal(reader.headers, placeIds[1], report(done.id, 'other', 'Autre'));
    expect(reported.statusCode, reported.body).toBe(201);
    expect(PlaceSignalReceipt.parse(reported.json())).toMatchObject({ reason: 'other' });
    expect((await signal(young.headers, placeIds[2], confirm(youngDone.id))).statusCode).toBe(201);

    expect(await signalsOn(placeIds[1])).toMatchObject([
      { kind: 'report', reason: 'other', comment: 'Autre', weight: 1.5 },
    ]);
    expect(await signalsOn(placeIds[2])).toMatchObject([{ kind: 'confirm', weight: 0.5 }]);
  });

  it('counts one signal per account and per place over 7 days, accepting the others (D-057)', async () => {
    const { routeId, placeIds } = await route();
    const { headers } = await visitor();
    const done = await outing(headers, routeId, 'completed');
    expect((await signal(headers, placeIds[0], confirm(done.id))).statusCode).toBe(201);

    const again = await signal(headers, placeIds[0], report(done.id, 'closed_today'));

    expect(again.statusCode).toBe(200);
    expect(PlaceSignalReceipt.parse(again.json())).toMatchObject({
      kind: 'report',
      reason: 'closed_today',
      isCounted: false,
    });
    const [first, ...others] = await signalsOn(placeIds[0]);
    expect(others).toEqual([]);
    // Another place counts; the same one again once the 7 days are over.
    expect((await signal(headers, placeIds[1], confirm(done.id))).statusCode).toBe(201);
    await app.db
      .update(placeSignals)
      .set({ createdAt: daysAgo(8) })
      .where(eq(placeSignals.id, first?.id ?? ''));
    expect((await signal(headers, placeIds[0], confirm(done.id))).statusCode).toBe(201);
  });

  it('ignores the signals of an account for 90 days after its third rejected report', async () => {
    const { routeId, placeIds } = await route();
    const { headers, id } = await visitor();
    const done = await outing(headers, routeId, 'completed');
    const rejected = (reviewedAt: Date) => ({
      placeId: placeIds[3] ?? '',
      userId: id,
      kind: 'report' as const,
      reason: 'wrong_hours' as const,
      weight: 2,
      contextPlannedRouteId: done.id,
      status: 'rejected' as const,
      reviewedAt,
      createdAt: daysAgo(100),
    });
    await app.db
      .insert(placeSignals)
      .values([rejected(daysAgo(95)), rejected(daysAgo(91)), rejected(daysAgo(89))]);

    const ignored = await signal(headers, placeIds[0], report(done.id, 'closed_temporarily'));

    expect(ignored.statusCode).toBe(200);
    expect(PlaceSignalReceipt.parse(ignored.json()).isCounted).toBe(false);
    expect(await signalsOn(placeIds[0])).toEqual([]);
    // 90 days after the last rejection, its signals count again.
    await app.db
      .update(placeSignals)
      .set({ reviewedAt: daysAgo(91) })
      .where(eq(placeSignals.userId, id));
    expect((await signal(headers, placeIds[0], confirm(done.id))).statusCode).toBe(201);
  });

  it('answers 429 past 30 signals a day for an account', async () => {
    const { routeId, placeIds } = await route();
    const { headers, id } = await visitor();
    const done = await outing(headers, routeId, 'completed');
    const written = {
      placeId: placeIds[3] ?? '',
      userId: id,
      kind: 'confirm' as const,
      weight: 2,
      contextPlannedRouteId: done.id,
    };
    await app.db.insert(placeSignals).values(Array.from({ length: 30 }, () => written));

    const response = await signal(headers, placeIds[0], confirm(done.id));

    expect(response.statusCode).toBe(429);
    expect(ApiError.parse(response.json())).toMatchObject({
      code: 'rate_limited',
      details: { reason: 'place_signals', limit: 30 },
    });
    expect(await signalsOn(placeIds[0])).toEqual([]);
  });
});
