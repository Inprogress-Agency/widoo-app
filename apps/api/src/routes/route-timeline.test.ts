import type { DirectionsLeg } from '@widoo/orchestration';
import { ApiError, PlannedRoute, RouteTimeline } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures, saturdayTen } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// `GET /routes/:id/timeline` (D-093): our estimates, as the planning stores them; a provider
// that would answer is set, to show it is never asked. Copies of the demo route, deleted after.
const verifier = new TestTokenVerifier();
const legs: DirectionsLeg[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
const startsAt = encodeURIComponent(saturdayTen);
const timelineOf = (id: string, query = `startsAt=${startsAt}`) =>
  app.inject({ url: `/v1/routes/${id}/timeline?${query}` });

beforeAll(async () => {
  app = await buildApp(testConfig(), {
    tokenVerifier: verifier,
    directions: {
      route: async (leg) => {
        legs.push(leg);
        return { distanceM: 1000, durationS: 6000, geometry: 'a~l~Fjk~uOwHJ' };
      },
    },
  });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

describe('GET /v1/routes/:id/timeline', () => {
  it('times the steps on the estimates the planning stores, without Mapbox', async () => {
    const id = await fixtures.copyDemoRoute();
    const response = await timelineOf(id);
    expect(response.statusCode).toBe(200);
    const timeline = RouteTimeline.parse(response.json());
    expect(legs).toEqual([]);
    const headers = await fixtures.signIn();
    const planned = await app.inject({
      method: 'POST',
      url: '/v1/me/planned',
      headers,
      payload: { routeId: id, startsAt: saturdayTen },
    });
    const times = (entries: RouteTimeline['steps']) =>
      entries.map(({ stepId, arrivesAt, leavesAt }) => ({ stepId, arrivesAt, leavesAt }));
    expect(times(timeline.steps)).toEqual(times(PlannedRoute.parse(planned.json()).timeline.steps));
    expect(timeline.startsAt).toBe(new Date(saturdayTen).toISOString());
  });

  it('answers 402 premium_required for a Premium route locked to the caller', async () => {
    const id = await fixtures.copyDemoRoute({ access: 'premium' });
    const response = await timelineOf(id);
    expect(response.statusCode).toBe(402);
    expect(response.json()).toMatchObject({
      code: 'premium_required',
      details: { reason: 'premium_route' },
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['without a start', ''],
    ['with a start without its offset', 'startsAt=2026-10-24T10:00:00'],
    ['with an unknown key', `startsAt=${startsAt}&trips=estimated`],
  ])('answers 400 validation_error %s', async (_, query) => {
    const id = await fixtures.copyDemoRoute();
    const response = await timelineOf(id, query);
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });

  it('keeps the access of the sheet: 404 for a private route without its link, 410 withdrawn', async () => {
    const shareToken = `Fictitious_${uuidv7().replaceAll('-', '')}`;
    const id = await fixtures.copyDemoRoute({ status: 'private', shareToken });
    expect((await timelineOf(id)).statusCode).toBe(404);
    const shared = await timelineOf(id, `startsAt=${startsAt}&token=${shareToken}`);
    expect(shared.statusCode).toBe(200);
    expect(shared.headers['cache-control']).toBe('private, no-store');
    expect(shared.headers.etag).toBeUndefined();
    const removed = await fixtures.copyDemoRoute({ status: 'unpublished' });
    expect((await timelineOf(removed)).statusCode).toBe(410);
  });

  it('is public 60 s without a token, private and revalidated with a Firebase token', async () => {
    const id = await fixtures.copyDemoRoute();
    const anonymous = await timelineOf(id);
    expect(anonymous.headers['cache-control']).toBe('public, max-age=60');
    expect(anonymous.headers.etag).toBeDefined();
    const signedIn = await app.inject({
      url: `/v1/routes/${id}/timeline?startsAt=${startsAt}`,
      headers: await fixtures.signIn(),
    });
    expect(signedIn.statusCode).toBe(200);
    expect(signedIn.headers['cache-control']).toBe('private, no-cache');
    expect(signedIn.headers.vary).toContain('Authorization');
  });
});
