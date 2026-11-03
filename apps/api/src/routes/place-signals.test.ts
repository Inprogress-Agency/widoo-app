import { ApiError, PlaceSignalReceipt } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
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
