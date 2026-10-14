import { ApiError, PlannedRoute } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedRoutes, users } from '../db/schema';
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
async function planned(headers: Headers, id = routeId) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/me/planned',
    headers,
    payload: { routeId: id, startsAt: saturdayTen },
  });
  return PlannedRoute.parse(response.json());
}
const patch = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/me/planned/${id}`, headers, payload });

describe('PATCH /v1/me/planned/:id', () => {
  it('recomputes the timeline for a new start, across the change of time', async () => {
    const headers = await fixtures.signIn();
    const { id } = await planned(headers);
    // Monday 26 October, 11:00 in Paris, UTC+1: Berthillon is closed on Mondays.
    const response = await patch(headers, id, { startsAt: '2026-10-26T11:00:00+01:00' });

    expect(response.statusCode).toBe(200);
    const updated = PlannedRoute.parse(response.json());
    expect(updated.startsAt).toBe('2026-10-26T10:00:00.000Z');
    expect(updated.timeline.startsAt).toBe('2026-10-26T10:00:00.000Z');
    expect(updated.timeline.steps.map((step) => step.conflicts)).toEqual([
      [],
      [],
      [],
      ['closed_that_day'],
    ]);
  });

  it('ticks and unticks a booking, and refuses a step that is not one', async () => {
    const headers = await fixtures.signIn();
    const { id, route } = await planned(headers);
    const [booking, other] = route.steps;
    const ticked = await patch(headers, id, {
      checklist: [{ stepId: booking?.id, isChecked: true }],
    });
    expect(PlannedRoute.parse(ticked.json()).checklist).toEqual([
      { stepId: booking?.id, isChecked: true },
    ]);

    const refused = await patch(headers, id, {
      checklist: [{ stepId: other?.id, isChecked: true }],
    });
    expect(refused.statusCode).toBe(422);
    expect(ApiError.parse(refused.json()).details).toMatchObject({
      issues: [{ location: 'body', path: 'checklist.0.stepId' }],
    });
  });

  it('starts, completes and closes a Go by the user, never reopened', async () => {
    const headers = await fixtures.signIn();
    const { id } = await planned(headers);
    expect(
      PlannedRoute.parse((await patch(headers, id, { status: 'in_progress' })).json()).status,
    ).toBe('in_progress');
    const completed = PlannedRoute.parse(
      (await patch(headers, id, { status: 'completed' })).json(),
    );
    expect(completed).toMatchObject({ status: 'completed', closedBy: 'user' });
    expect(completed.completedAt).not.toBeNull();

    const reopened = await patch(headers, id, { status: 'planned' });
    expect(reopened.statusCode).toBe(409);
    expect(ApiError.parse(reopened.json()).code).toBe('conflict');
    expect((await patch(headers, id, { startsAt: saturdayTen })).statusCode).toBe(409);
  });

  it('stops a Go without a note, then relaunches it', async () => {
    const headers = await fixtures.signIn();
    const { id } = await planned(headers);
    await patch(headers, id, { status: 'in_progress' });
    const stopped = PlannedRoute.parse((await patch(headers, id, { status: 'stopped' })).json());
    expect(stopped).toMatchObject({ status: 'stopped', closedBy: 'user', completedAt: null });
    const relaunched = PlannedRoute.parse(
      (await patch(headers, id, { status: 'in_progress' })).json(),
    );
    expect(relaunched).toMatchObject({ status: 'in_progress', closedBy: null });
    expect((await patch(headers, id, { personalNote: 'x' })).statusCode).toBe(422);
  });

  it('keeps one Go in progress at a time', async () => {
    const headers = await fixtures.signIn();
    const first = await planned(headers);
    const second = await planned(headers);
    await patch(headers, first.id, { status: 'in_progress' });
    const refused = await patch(headers, second.id, { status: 'in_progress' });
    expect(refused.statusCode).toBe(409);
    expect(ApiError.parse(refused.json()).code).toBe('conflict');
  });

  it('brings back a cancelled planning, and a missed one with a new start only', async () => {
    const headers = await fixtures.signIn();
    const { id } = await planned(headers);
    await patch(headers, id, { status: 'cancelled' });
    expect((await patch(headers, id, { status: 'planned' })).statusCode).toBe(200);
    expect((await patch(headers, id, { status: 'missed' })).statusCode).toBe(422);

    await app.db.update(plannedRoutes).set({ status: 'missed' }).where(eq(plannedRoutes.id, id));
    expect((await patch(headers, id, { status: 'planned' })).statusCode).toBe(422);
    const again = await patch(headers, id, { status: 'planned', startsAt: '2026-11-07T10:00:00Z' });
    expect(PlannedRoute.parse(again.json())).toMatchObject({
      status: 'planned',
      startsAt: '2026-11-07T10:00:00.000Z',
    });
  });

  it('answers 402 on a new start or a new Go of a Premium route once the plan ends', async () => {
    const premiumId = await fixtures.copyDemoRoute({ access: 'premium' });
    const headers = await fixtures.signIn({ plan: 'premium' });
    const { id } = await planned(headers, premiumId);
    const me = await app.inject({ url: '/v1/me', headers });
    await app.db
      .update(users)
      .set({ plan: 'free' })
      .where(eq(users.id, me.json<{ id: string }>().id));

    for (const body of [{ startsAt: saturdayTen }, { status: 'in_progress' }]) {
      const refused = await patch(headers, id, body);
      expect(refused.statusCode).toBe(402);
      expect(ApiError.parse(refused.json()).details).toEqual({ reason: 'premium_route' });
    }
    expect((await patch(headers, id, { status: 'cancelled' })).statusCode).toBe(200);
  });

  it('keeps a new start and a Go open to a Premium route bought alone once the plan ends', async () => {
    const premiumId = await fixtures.copyDemoRoute({ access: 'premium' });
    const headers = await fixtures.signIn({ plan: 'premium' });
    const { id } = await planned(headers, premiumId);
    await fixtures.unlock(headers, premiumId);
    const me = await app.inject({ url: '/v1/me', headers });
    await app.db
      .update(users)
      .set({ plan: 'free' })
      .where(eq(users.id, me.json<{ id: string }>().id));

    expect((await patch(headers, id, { startsAt: saturdayTen })).statusCode).toBe(200);
    expect((await patch(headers, id, { status: 'in_progress' })).statusCode).toBe(200);
  });

  it("answers 404 for another user's planning and leaves it unchanged", async () => {
    const owner = await fixtures.signIn();
    const other = await fixtures.signIn();
    const { id } = await planned(owner);
    expect((await patch(other, id, { status: 'cancelled' })).statusCode).toBe(404);
    expect((await patch(other, uuidv7(), { status: 'cancelled' })).statusCode).toBe(404);
    const [row] = await app.db.select().from(plannedRoutes).where(eq(plannedRoutes.id, id));
    expect(row?.status).toBe('planned');
  });
});
