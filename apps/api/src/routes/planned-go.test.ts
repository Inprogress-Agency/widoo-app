import { ApiError, PlannedMapsUrl, PlannedRoute } from '@widoo/shared';
import { travelModeOf } from '@widoo/orchestration';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedSteps, steps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
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
const mapsUrl = (headers: Headers, id: string) =>
  app.inject({ url: `/v1/me/planned/${id}/maps-url`, headers });

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

describe('GET /v1/me/planned/:id/maps-url', () => {
  /** The destination of a Google Maps URL, decoded as the test compares it. */
  const destinationOf = (url: string) => new URL(url).searchParams.get('destination');
  /** The mode of the trip to a step of the next one, as a creator keeps it. */
  const trips = ['bike', 'metro', 'car'] as const;

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

  it('opens Google Maps in the mode of the trip to the next steps', async () => {
    const headers = await fixtures.signIn();
    const modeRoute = await fixtures.copyDemoRoute();
    for (const [position, mode] of trips.entries()) {
      await app.db
        .update(steps)
        .set({ transition: { distanceM: 900, durationMin: 10, mode, estimated: true } })
        .where(and(eq(steps.routeId, modeRoute), eq(steps.position, position)));
    }
    const { id, route } = await go(headers, true, modeRoute);
    // No trip of the route leads to the first step: on foot, even with a bike trip after it.
    expect(
      PlannedMapsUrl.parse((await mapsUrl(headers, id)).json()).url,
    ).toContain('travelmode=walking');
    for (const [stepIndex, mode] of trips.entries()) {
      await done(headers, id, route.steps[stepIndex]?.id);
      const answer = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
      expect(answer.stepId).toBe(route.steps[stepIndex + 1]?.id);
      expect(answer.url).toContain(`travelmode=${travelModeOf(mode)}`);
      // One destination, no waypoints: never the whole route.
      expect(destinationOf(answer.url)).not.toBeNull();
      expect(answer.url).not.toContain('waypoints');
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
