import { ApiError, PlannedRoute } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedRoutes, routes } from '../db/schema';
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

const plan = (headers: Record<string, string>, payload: object) =>
  app.inject({ method: 'POST', url: '/v1/me/planned', headers, payload });

describe('POST /v1/me/planned', () => {
  it('answers 401 without a token', async () => {
    const response = await plan({}, { routeId, startsAt: saturdayTen });
    expect(response.statusCode).toBe(401);
  });

  it('plans the route with its timeline, conflicts and bookings, never cached', async () => {
    const headers = await fixtures.signIn();
    const response = await plan(headers, { routeId, startsAt: saturdayTen });

    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    const planned = PlannedRoute.parse(response.json());
    expect(planned).toMatchObject({ routeId, status: 'planned', closedBy: null });
    expect(planned.startsAt).toBe('2026-10-24T08:00:00.000Z');
    expect(planned.route.steps).toHaveLength(4);
    // Trips estimated on foot, without the directions provider; none after the last step.
    const trips = planned.route.steps.map((step) => step.transition?.estimated ?? null);
    expect(trips).toEqual([true, true, true, null]);
    // Merci opens at 10:30 and L'As du Fallafel is closed on Saturdays.
    expect(planned.timeline.steps.map((step) => step.conflicts)).toEqual([
      ['closed_at_arrival'],
      ['closed_that_day'],
      [],
      [],
    ]);
    expect(planned.checklist).toEqual([{ stepId: planned.route.steps[0]?.id, isChecked: false }]);
    expect(planned.steps.every((step) => step.doneAt === null)).toBe(true);
  });

  it('refuses an unknown key with 422, and an unknown or unpublished route with 404', async () => {
    const headers = await fixtures.signIn();
    const invalid = await plan(headers, { routeId, startsAt: saturdayTen, personalNote: 'x' });
    expect(invalid.statusCode).toBe(422);
    expect(ApiError.parse(invalid.json()).code).toBe('validation_error');
    expect((await plan(headers, { routeId: uuidv7(), startsAt: saturdayTen })).statusCode).toBe(
      404,
    );
    const draftId = await fixtures.copyDemoRoute({ status: 'draft' });
    expect((await plan(headers, { routeId: draftId, startsAt: saturdayTen })).statusCode).toBe(404);
  });

  it('answers 402 premium_required for a Premium route without the right to it', async () => {
    const premiumId = await fixtures.copyDemoRoute({ access: 'premium' });
    const free = await fixtures.signIn();
    const refused = await plan(free, { routeId: premiumId, startsAt: saturdayTen });
    expect(refused.statusCode).toBe(402);
    expect(ApiError.parse(refused.json())).toMatchObject({
      code: 'premium_required',
      details: { reason: 'premium_route' },
    });
    const premium = await fixtures.signIn({ plan: 'premium' });
    expect((await plan(premium, { routeId: premiumId, startsAt: saturdayTen })).statusCode).toBe(
      201,
    );
  });
});

describe('GET /v1/me/planned/:id', () => {
  it('keeps a planning readable once its route is unpublished (snapshot)', async () => {
    const headers = await fixtures.signIn();
    const copyId = await fixtures.copyDemoRoute();
    const created = PlannedRoute.parse(
      (await plan(headers, { routeId: copyId, startsAt: saturdayTen })).json(),
    );
    await app.db
      .update(routes)
      .set({ status: 'unpublished', title: 'Titre changé' })
      .where(eq(routes.id, copyId));

    const response = await app.inject({ url: `/v1/me/planned/${created.id}`, headers });
    expect(response.statusCode).toBe(200);
    const planned = PlannedRoute.parse(response.json());
    expect(planned.route.title).toBe(created.route.title);
    expect(planned.route.steps).toEqual(created.route.steps);
  });

  it("answers 404 for another user's planning", async () => {
    const owner = await fixtures.signIn();
    const other = await fixtures.signIn();
    const created = PlannedRoute.parse(
      (await plan(owner, { routeId, startsAt: saturdayTen })).json(),
    );

    const read = await app.inject({ url: `/v1/me/planned/${created.id}`, headers: other });
    expect(read.statusCode).toBe(404);
  });
});

describe('DELETE /v1/me', () => {
  it('erases the plannings of the account', async () => {
    const headers = await fixtures.signIn();
    const created = PlannedRoute.parse(
      (await plan(headers, { routeId, startsAt: saturdayTen })).json(),
    );
    expect((await app.inject({ method: 'DELETE', url: '/v1/me', headers })).statusCode).toBe(204);
    const left = await app.db.select().from(plannedRoutes).where(eq(plannedRoutes.id, created.id));
    expect(left).toEqual([]);
  });
});
