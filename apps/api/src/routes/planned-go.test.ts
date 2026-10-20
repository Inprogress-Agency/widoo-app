import { ApiError, PlannedMapsUrl, PlannedRoute, PlannedRouteList } from '@widoo/shared';
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

describe('markStepArrived, skipStep and unskipStep', () => {
  const userIdOf = async (headers: Headers) =>
    (await app.inject({ url: '/v1/me', headers })).json<{ id: string }>().id;
  // Distinct times, so that a second call that wrote its own time would show.
  const first = new Date('2026-10-24T10:05:00.000Z');
  const later = new Date('2026-10-24T10:20:00.000Z');

  it('marks a step arrived once, keeping the first time', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const userId = await userIdOf(headers);
    const stepId = route.steps[0]?.id ?? '';

    const arrived = await markStepArrived(app.db, userId, id, stepId, first);
    expect(arrived.steps[0]).toEqual({
      stepId,
      arrivedAt: first.toISOString(),
      doneAt: null,
      skippedAt: null,
    });
    const again = await markStepArrived(app.db, userId, id, stepId, later);
    expect(again.steps[0]?.arrivedAt).toBe(first.toISOString());
  });

  it('skips a step once, never done, and « Annuler » gives back the step as it was', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const userId = await userIdOf(headers);
    const [onSite, onTheWay] = route.steps.map((step) => step.id);

    // On site (arrived), then skipped: « Annuler » keeps the arrival.
    await markStepArrived(app.db, userId, id, onSite ?? '', first);
    const skipped = await skipStep(app.db, userId, id, onSite ?? '', later);
    expect(skipped.steps[0]).toMatchObject({ doneAt: null, skippedAt: later.toISOString() });
    const skippedAgain = await skipStep(app.db, userId, id, onSite ?? '', new Date());
    expect(skippedAgain.steps[0]?.skippedAt).toBe(later.toISOString());
    const unskipped = await unskipStep(app.db, userId, id, onSite ?? '');
    expect(unskipped.steps[0]).toEqual({
      stepId: onSite,
      arrivedAt: first.toISOString(),
      doneAt: null,
      skippedAt: null,
    });

    // On the way (never arrived), then skipped: « Annuler » gives an untouched step back.
    await skipStep(app.db, userId, id, onTheWay ?? '', later);
    const back = await unskipStep(app.db, userId, id, onTheWay ?? '');
    expect(back.steps[1]).toEqual({
      stepId: onTheWay,
      arrivedAt: null,
      doneAt: null,
      skippedAt: null,
    });
    // Idempotent: unskipping a step that is not skipped changes nothing.
    expect((await unskipStep(app.db, userId, id, onTheWay ?? '')).steps[1]).toEqual(back.steps[1]);
  });

  it('refuses to skip a done step with 409, leaving it done', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const userId = await userIdOf(headers);
    const stepId = route.steps[0]?.id ?? '';
    await markStepDone(app.db, userId, id, stepId, first);
    await expect(skipStep(app.db, userId, id, stepId, later)).rejects.toMatchObject({
      statusCode: 409,
    });
    const [row] = await app.db
      .select()
      .from(plannedSteps)
      .where(and(eq(plannedSteps.plannedRouteId, id), eq(plannedSteps.stepId, stepId)));
    expect(row).toMatchObject({ doneAt: first, skippedAt: null });
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

  it('answers 409 once the Go is stopped', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const payload = { status: 'stopped' };
    await app.inject({ method: 'PATCH', url: `/v1/me/planned/${id}`, headers, payload });
    for (const response of [
      await arrived(headers, id, route.steps[0]?.id),
      await skip(headers, id, route.steps[0]?.id),
      await unskip(headers, id, route.steps[0]?.id),
    ]) {
      expect(response.statusCode).toBe(409);
      expect(ApiError.parse(response.json()).code).toBe('conflict');
    }
  });

  it('shows the arrival and the skip to another phone of the account, on both reads', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const [onSite, passed] = route.steps.map((step) => step.id);
    await arrived(headers, id, onSite);
    await skip(headers, id, passed);

    const one = PlannedRoute.parse(
      (await app.inject({ url: `/v1/me/planned/${id}`, headers })).json(),
    );
    const list = PlannedRouteList.parse(
      (await app.inject({ url: '/v1/me/planned', headers })).json(),
    );
    for (const read of [one, list.items.find((item) => item.id === id)]) {
      expect(read?.steps[0]).toMatchObject({ stepId: onSite, doneAt: null, skippedAt: null });
      expect(read?.steps[0]?.arrivedAt).not.toBeNull();
      expect(read?.steps[1]).toMatchObject({ stepId: passed, arrivedAt: null, doneAt: null });
      expect(read?.steps[1]?.skippedAt).not.toBeNull();
    }
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
    for (const response of [
      await arrived(headers, id, first?.id),
      await skip(headers, id, first?.id),
      await unskip(headers, id, first?.id),
    ]) {
      expect(response.headers['cache-control']).toBe('no-store');
    }
    await skip(headers, id, first?.id);

    const unskipped = PlannedRoute.parse((await unskip(headers, id, first?.id)).json());
    expect(unskipped.steps[0]).toEqual({
      stepId: first?.id,
      arrivedAt,
      doneAt: null,
      skippedAt: null,
    });
    // Idempotent: unskipping a step that was never skipped anyway.
    expect(
      PlannedRoute.parse((await unskip(headers, id, first?.id)).json()).steps[0]?.skippedAt,
    ).toBe(null);
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

  it('answers 409 once the Go is stopped', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const payload = { status: 'stopped' };
    await app.inject({ method: 'PATCH', url: `/v1/me/planned/${id}`, headers, payload });
    for (const response of [
      await arrived(headers, id, route.steps[0]?.id),
      await skip(headers, id, route.steps[0]?.id),
      await unskip(headers, id, route.steps[0]?.id),
    ]) {
      expect(response.statusCode).toBe(409);
      expect(ApiError.parse(response.json()).code).toBe('conflict');
    }
  });

  it('shows the arrival and the skip to another phone of the account, on both reads', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const [onSite, passed] = route.steps.map((step) => step.id);
    await arrived(headers, id, onSite);
    await skip(headers, id, passed);

    const one = PlannedRoute.parse(
      (await app.inject({ url: `/v1/me/planned/${id}`, headers })).json(),
    );
    const list = PlannedRouteList.parse(
      (await app.inject({ url: '/v1/me/planned', headers })).json(),
    );
    for (const read of [one, list.items.find((item) => item.id === id)]) {
      expect(read?.steps[0]).toMatchObject({ stepId: onSite, doneAt: null, skippedAt: null });
      expect(read?.steps[0]?.arrivedAt).not.toBeNull();
      expect(read?.steps[1]).toMatchObject({ stepId: passed, arrivedAt: null, doneAt: null });
      expect(read?.steps[1]?.skippedAt).not.toBeNull();
    }
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
