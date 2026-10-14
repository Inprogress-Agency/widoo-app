import { ApiError, PlannedMapsUrl, PlannedRoute } from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedSteps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { walkingMapsUrl } from '../planned/go';
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
/** A planning of the caller, its Go started unless `isStarted` is false. */
async function go(headers: Headers, isStarted = true) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/me/planned',
    headers,
    payload: { routeId, startsAt: saturdayTen },
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

describe('walkingMapsUrl', () => {
  it('builds a Google Maps URL on foot to one point', () => {
    const url = new URL(walkingMapsUrl({ lat: 48.85661, lng: 2.35222 }));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      api: '1',
      destination: '48.85661,2.35222',
      travelmode: 'walking',
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

describe('GET /v1/me/planned/:id/maps-url', () => {
  it('opens Google Maps on foot to the next step only', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    const [first, second] = route.steps;

    const toFirst = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
    expect(toFirst).toEqual({
      stepId: first?.id,
      url: walkingMapsUrl(first?.place.location ?? { lat: 0, lng: 0 }),
    });
    await done(headers, id, first?.id);
    const toSecond = PlannedMapsUrl.parse((await mapsUrl(headers, id)).json());
    expect(toSecond.stepId).toBe(second?.id);
    const url = new URL(toSecond.url);
    expect(url.searchParams.get('destination')).toBe(
      `${second?.place.location.lat},${second?.place.location.lng}`,
    );
    expect(url.searchParams.get('travelmode')).toBe('walking');
    // One destination, no waypoints: never the whole route.
    expect(url.searchParams.has('waypoints')).toBe(false);
  });

  it("answers 409 once every step is done, and 404 for another user's planning", async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await go(headers);
    for (const step of route.steps) await done(headers, id, step.id);
    expect((await mapsUrl(headers, id)).statusCode).toBe(409);
    expect((await mapsUrl(await fixtures.signIn(), id)).statusCode).toBe(404);
  });
});
