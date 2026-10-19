import { ApiError, PlannedMapsUrl, PlannedRoute } from '@widoo/shared';
import { stepMapsUrl } from '@widoo/orchestration';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedSteps, steps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { markStepArrived, markStepDone, skipStep, unskipStep } from '../planned/go';
import { plannedFixtures, saturdayTen } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
let routeId: string;

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  routeId = await fixtures.copyDemoRoute();
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

type Headers = Record<string, string>;
/** A planning of the caller, its Go started unless `isStarted` is false; `route`'s plannable. */
async function go(headers: Headers, isStarted = true, route = routeId) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/me/planned',
    headers,
    payload: { routeId: route, startsAt: saturdayTen },
  });
  const planned = PlannedRoute.parse(response.json());
  if (isStarted) {
    const payload = { status: 'in_progress' };
    await app.inject({ method: 'PATCH', url: `/v1/me/planned/${planned.id}`, headers, payload });
  }
  return planned;
}
const done = (headers: Headers, id: string, stepId: string | undefined, payload?: object) =>
  app.inject({
    method: 'POST',
    url: `/v1/me/planned/${id}/steps/${stepId}/done`,
    headers,
    ...(payload && { payload }),
  });
const arrived = (headers: Headers, id: string, stepId: string | undefined, payload?: object) =>
  app.inject({
    method: 'POST',
    url: `/v1/me/planned/${id}/steps/${stepId}/arrived`,
    headers,
    ...(payload && { payload }),
  });
const skip = (headers: Headers, id: string, stepId: string | undefined, payload?: object) =>
  app.inject({
    method: 'POST',
    url: `/v1/me/planned/${id}/steps/${stepId}/skip`,
    headers,
    ...(payload && { payload }),
  });
const unskip = (headers: Headers, id: string, stepId: string | undefined) =>
  app.inject({
    method: 'DELETE',
    url: `/v1/me/planned/${id}/steps/${stepId}/skip`,
    headers,
  });
const mapsUrl = (headers: Headers, id: string) =>
  app.inject({ url: `/v1/me/planned/${id}/maps-url`, headers });

describe('markStepArrived and skipStep', () => {
  const userIdOf = async (headers: Headers) =>
    (await app.inject({ url: '/v1/me', headers })).json<{ id: string }>().id;

  it('marks arrived once, skips a second time, and unskips back to before', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const userId = await userIdOf(headers);
    const stepId = route.steps[0]?.id ?? '';

    const arrived = await markStepArrived(app.db, userId, id, stepId, new Date());
    const arrivedAt = arrived.steps[0]?.arrivedAt;
    expect(arrivedAt).not.toBeNull();
    // A second « J'y suis » keeps the first time.
    const again = await markStepArrived(app.db, userId, id, stepId, new Date());
    expect(again.steps[0]?.arrivedAt).toBe(arrivedAt);

    const skipped = await skipStep(app.db, userId, id, stepId, new Date());
    const skippedAt = skipped.steps[0]?.skippedAt;
    expect(skippedAt).not.toBeNull();
    expect(skipped.steps[0]?.doneAt).toBeNull();
    // A second « Passer cette étape » keeps the first time too.
    const skippedAgain = await skipStep(app.db, userId, id, stepId, new Date());
    expect(skippedAgain.steps[0]?.skippedAt).toBe(skippedAt);

    // « Annuler » puts the step back as it was, arrival kept, never done.
    const unskipped = await unskipStep(app.db, userId, id, stepId);
    expect(unskipped.steps[0]).toEqual({ stepId, arrivedAt, doneAt: null, skippedAt: null });
    const unskippedAgain = await unskipStep(app.db, userId, id, stepId);
    expect(unskippedAgain.steps[0]?.skippedAt).toBeNull();
  });

  it('refuses to skip a done step with 409', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const userId = await userIdOf(headers);
    const stepId = route.steps[0]?.id ?? '';
    await markStepDone(app.db, userId, id, stepId, new Date());
    await expect(skipStep(app.db, userId, id, stepId, new Date())).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
describe('POST /v1/me/planned/:id/steps/:stepId/done', () => {
  it('marks a step done once, and a skipped step done', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const [first, second] = route.steps;
    const marked = PlannedRoute.parse((await done(headers, id, first?.id)).json());
    const doneAt = marked.steps[0]?.doneAt;
    expect(doneAt).not.toBeNull();
    const again = PlannedRoute.parse((await done(headers, id, first?.id)).json());
    expect(again.steps[0]?.doneAt).toBe(doneAt);

    await app.db
      .update(plannedSteps)
      .set({ skippedAt: new Date() })
      .where(and(eq(plannedSteps.plannedRouteId, id), eq(plannedSteps.stepId, second?.id ?? '')));
    const unskipped = PlannedRoute.parse((await done(headers, id, second?.id)).json());
    expect(unskipped.steps[1]).toMatchObject({ skippedAt: null });
    expect(unskipped.steps[1]?.doneAt).not.toBeNull();
  });

  it('answers 409 outside a Go, 404 for an unknown step, 422 for a body', async () => {
    const headers = await fixtures.signIn();
    const planned = await go(headers, false);
    const stepId = planned.route.steps[0]?.id;
    expect((await done(headers, planned.id, stepId)).statusCode).toBe(409);
    expect((await done(headers, planned.id, stepId, {})).statusCode).toBe(409);
    const started = await go(headers);
    expect((await done(headers, started.id, uuidv7())).statusCode).toBe(404);
    const signal = { signal: { kind: 'confirmed' } };
    expect((await done(headers, started.id, started.route.steps[0]?.id, signal)).statusCode).toBe(
      422,
    );
  });

  it("answers 404 for another user's planning", async () => {
    const { id, route } = await go(await fixtures.signIn());
    const response = await done(await fixtures.signIn(), id, route.steps[0]?.id);
    expect(response.statusCode).toBe(404);
    expect(ApiError.parse(response.json()).code).toBe('not_found');
  });
});

describe('POST and DELETE /v1/me/planned/:id/steps/:stepId/(arrived|skip)', () => {
  it('marks arrived and skipped once, and unskips back to before', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const [first] = route.steps;

    const marked = PlannedRoute.parse((await arrived(headers, id, first?.id)).json());
    const arrivedAt = marked.steps[0]?.arrivedAt;
    expect(arrivedAt).not.toBeNull();
    expect(marked.steps[0]?.doneAt).toBeNull();
    const again = PlannedRoute.parse((await arrived(headers, id, first?.id)).json());
    expect(again.steps[0]?.arrivedAt).toBe(arrivedAt);

    const skipped = PlannedRoute.parse((await skip(headers, id, first?.id)).json());
    const skippedAt = skipped.steps[0]?.skippedAt;
    expect(skippedAt).not.toBeNull();
    expect(skipped.steps[0]?.doneAt).toBeNull();
    // Plannings are personal: never cached.
    expect((await arrived(headers, id, first?.id)).headers['cache-control']).toBe('no-store');

    const unskipped = PlannedRoute.parse((await unskip(headers, id, first?.id)).json());
    expect(unskipped.steps[0]).toEqual({
      stepId: first?.id,
      arrivedAt,
      doneAt: null,
      skippedAt: null,
    });
    // Idempotent: unskipping a step that was never skipped anyway.
    expect(PlannedRoute.parse((await unskip(headers, id, first?.id)).json()).steps[0]?.skippedAt).toBe(
      null,
    );
  });

  it('refuses to skip a done step with 409', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    await done(headers, id, route.steps[0]?.id);
    const response = await skip(headers, id, route.steps[0]?.id);
    expect(response.statusCode).toBe(409);
    expect(ApiError.parse(response.json()).code).toBe('conflict');
  });

  it('answers 409 outside a Go, 404 for an unknown step, 422 for a body', async () => {
    const headers = await fixtures.signIn();
    const planned = await go(headers, false);
    const stepId = planned.route.steps[0]?.id;
    expect((await arrived(headers, planned.id, stepId)).statusCode).toBe(409);
    expect((await skip(headers, planned.id, stepId)).statusCode).toBe(409);
    expect((await unskip(headers, planned.id, stepId)).statusCode).toBe(409);
    const started = await go(headers);
    expect((await arrived(headers, started.id, uuidv7())).statusCode).toBe(404);
    expect((await skip(headers, started.id, uuidv7())).statusCode).toBe(404);
    expect((await unskip(headers, started.id, uuidv7())).statusCode).toBe(404);
    // Like `done`, a body waits for `place_signals` (#49).
    expect(
      (await arrived(headers, started.id, started.route.steps[0]?.id, { signal: {} })).statusCode,
    ).toBe(422);
    expect(
      (await skip(headers, started.id, started.route.steps[0]?.id, { signal: {} })).statusCode,
    ).toBe(422);
  });

  it("answers 404 for another user's planning", async () => {
    const { id, route } = await go(await fixtures.signIn());
    const other = await fixtures.signIn();
    for (const response of [
      await arrived(other, id, route.steps[0]?.id),
      await skip(other, id, route.steps[0]?.id),
      await unskip(other, id, route.steps[0]?.id),
    ]) {
      expect(response.statusCode).toBe(404);
      expect(ApiError.parse(response.json()).code).toBe('not_found');
    }
  });
});

describe('GET /v1/me/planned/:id/maps-url', () => {
  /** The destination of a Google Maps URL, decoded as the test compares it. */
  const destinationOf = (url: string) => new URL(url).searchParams.get('destination');
  /** The trip of each of the first three steps to the next one, and its Google Maps mode. */
  const trips = [
    ['bike', 'bicycling'],
    ['metro', 'transit'],
    ['car', 'driving'],
  ] as const;

  it('opens Google Maps on foot to the next step only', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const [first, second] = route.steps;
    const location = first?.place.location ?? { lat: 0, lng: 0 };

    const toFirst = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
    expect(toFirst).toEqual({
      stepId: first?.id,
      url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${location.lat},${location.lng}`,
      )}&travelmode=walking`,
    });
    await done(headers, id, first?.id);
    const toSecond = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
    expect(toSecond.stepId).toBe(second?.id);
    expect(destinationOf(toSecond.url)).toBe(
      `${second?.place.location.lat},${second?.place.location.lng}`,
    );
    expect(toSecond.url).toContain('travelmode=walking');
  });

  it('opens Google Maps in the mode of the trip to the next steps, as the app does offline', async () => {
    const headers = await fixtures.signIn();
    const modeRoute = await fixtures.copyDemoRoute();
    for (const [position, [mode]] of trips.entries()) {
      await app.db
        .update(steps)
        .set({ transition: { distanceM: 900, durationMin: 10, mode, estimated: true } })
        .where(and(eq(steps.routeId, modeRoute), eq(steps.position, position)));
    }
    const { id, route } = await go(headers, true, modeRoute);
    // No trip of the route leads to the first step: on foot, even with a bike trip after it.
    const toFirst = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
    expect(toFirst.url).toContain('travelmode=walking');
    // The app, offline, writes the URL of the same step from the same planning (#510).
    expect(toFirst.url).toBe(stepMapsUrl(route.steps, 0));
    for (const [index, [, travelmode]] of trips.entries()) {
      await done(headers, id, route.steps[index]?.id);
      const next = route.steps[index + 1];
      const answer = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
      expect(answer.stepId).toBe(next?.id);
      expect(new URL(answer.url).searchParams.get('travelmode')).toBe(travelmode);
      expect(answer.url).toBe(stepMapsUrl(route.steps, index + 1));
      // One destination, the step's, and no waypoints: never the whole route (D-032).
      expect(destinationOf(answer.url)).toBe(
        `${next?.place.location.lat},${next?.place.location.lng}`,
      );
      expect(new URL(answer.url).searchParams.has('waypoints')).toBe(false);
    }
  });

  it("answers 409 once every step is done, and 404 for another user's planning", async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    for (const step of route.steps) await done(headers, id, step.id);
    expect((await mapsUrl(headers, id)).statusCode).toBe(409);
    expect((await mapsUrl(await fixtures.signIn(), id)).statusCode).toBe(404);
  });
});
