import { MyRouteRating, PlannedRoute, PlannedRouteList } from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedSteps, routeReports, routes } from '../db/schema';
import { ratingOf } from '../db/route-stats';
import { plannedFixtures, saturdayTen } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

type Headers = Record<string, string>;
const patch = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/me/planned/${id}`, headers, payload });
const rate = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'POST', url: `/v1/me/planned/${id}/rating`, headers, payload });

/**
 * An outing of the caller on `routeId`, started, with its first `done` steps done and the next
 * `skipped` ones skipped, then closed as `status` (left in progress for `in_progress`).
 */
async function outing(
  headers: Headers,
  routeId: string,
  {
    done = 99,
    skipped = 0,
    status = 'completed',
  }: { done?: number; skipped?: number; status?: string } = {},
) {
  const created = await app.inject({
    method: 'POST',
    url: '/v1/me/planned',
    headers,
    payload: { routeId, startsAt: saturdayTen },
  });
  const planned = PlannedRoute.parse(created.json());
  if (status === 'planned') return planned;
  await patch(headers, planned.id, { status: 'in_progress' });
  const stepIds = planned.route.steps.map((step) => step.id);
  const ofSteps = (ids: string[]) =>
    and(eq(plannedSteps.plannedRouteId, planned.id), inArray(plannedSteps.stepId, ids));
  const doneIds = stepIds.slice(0, done);
  const skippedIds = stepIds.slice(done, done + skipped);
  if (doneIds.length > 0) {
    await app.db.update(plannedSteps).set({ doneAt: new Date() }).where(ofSteps(doneIds));
  }
  if (skippedIds.length > 0) {
    await app.db.update(plannedSteps).set({ skippedAt: new Date() }).where(ofSteps(skippedIds));
  }
  if (status !== 'in_progress') await patch(headers, planned.id, { status });
  return planned;
}

const statsOf = async (routeId: string) => {
  const [route] = await app.db
    .select({ stats: routes.stats })
    .from(routes)
    .where(eq(routes.id, routeId));
  return ratingOf(route?.stats);
};

describe('POST /v1/me/planned/:id/rating', () => {
  it('refuses to rate an outing that is not completed', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const headers = await fixtures.signIn({ firstName: 'Camille' });
    for (const status of ['planned', 'in_progress', 'stopped']) {
      const planned = await outing(headers, routeId, { status });
      const response = await rate(headers, planned.id, { rating: 4 });
      expect(response.statusCode, status).toBe(409);
      if (status === 'in_progress') await patch(headers, planned.id, { status: 'stopped' });
    }
    expect(await statsOf(routeId)).toEqual({ average: null, count: 0 });
  });

  it('never rates the outing of another user, nor without an account', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const planned = await outing(await fixtures.signIn(), routeId);
    const other = await fixtures.signIn();
    expect((await rate(other, planned.id, { rating: 5 })).statusCode).toBe(404);
    expect((await rate({}, planned.id, { rating: 5 })).statusCode).toBe(401);
  });

  it('opens from half of the steps done, even when the others were skipped', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const headers = await fixtures.signIn();
    const probe = await outing(headers, routeId, { status: 'planned' });
    const half = Math.ceil(probe.route.steps.length / 2);
    const under = await outing(headers, routeId, { done: half - 1, skipped: 1 });
    expect((await rate(headers, under.id, { rating: 3 })).statusCode).toBe(409);
    const enough = await outing(headers, routeId, { done: half, skipped: 1 });
    expect((await rate(headers, enough.id, { rating: 3 })).statusCode).toBe(200);
  });

  it('keeps one rating per user and route: a new outing updates it', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const headers = await fixtures.signIn({ firstName: 'Camille' });
    const first = await outing(headers, routeId);
    const created = await rate(headers, first.id, { rating: 2, comment: 'Trop de monde.' });
    expect(MyRouteRating.parse(created.json())).toMatchObject({
      rating: 2,
      comment: 'Trop de monde.',
    });
    expect(await statsOf(routeId)).toEqual({ average: 2, count: 1 });

    const second = await outing(headers, routeId);
    const updated = await rate(headers, second.id, { rating: 5 });
    expect(MyRouteRating.parse(updated.json())).toMatchObject({ rating: 5, comment: null });
    expect(await statsOf(routeId)).toEqual({ average: 5, count: 1 });

    // Each outing of the route carries the rating, read and changed from any of them.
    for (const id of [first.id, second.id]) {
      const read = await app.inject({ url: `/v1/me/planned/${id}`, headers });
      expect(PlannedRoute.parse(read.json()).myRating).toMatchObject({ rating: 5, comment: null });
    }
    const list = await app.inject({ url: '/v1/me/planned?status=completed', headers });
    expect(PlannedRouteList.parse(list.json()).items.map((item) => item.myRating?.rating)).toEqual([
      5, 5,
    ]);
  });

  it('refuses a personal note, a rating out of 1 to 5 and a comment over 280', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const headers = await fixtures.signIn();
    const planned = await outing(headers, routeId);
    expect((await rate(headers, planned.id, { rating: 4, personalNote: 'x' })).statusCode).toBe(
      422,
    );
    expect(
      (await rate(headers, planned.id, { rating: 4, comment: 'a'.repeat(281) })).statusCode,
    ).toBe(422);
    expect((await rate(headers, planned.id, { rating: 6 })).statusCode).toBe(422);
  });

  // Eleven accounts, each with a whole outing: slower than the others.
  it('opens one low_rating report under 2.5 with 5 ratings, again after 5 new ones', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const rateLow = async (ratings: number[]) => {
      for (const rating of ratings) {
        const headers = await fixtures.signIn();
        const planned = await outing(headers, routeId);
        expect((await rate(headers, planned.id, { rating })).statusCode).toBe(200);
      }
    };
    const lowReports = () =>
      app.db
        .select({ status: routeReports.status, userId: routeReports.userId })
        .from(routeReports)
        .where(and(eq(routeReports.routeId, routeId), eq(routeReports.reason, 'low_rating')))
        .orderBy(routeReports.createdAt);

    await rateLow([1, 2, 3, 2]);
    expect(await lowReports()).toEqual([]);
    await rateLow([1, 1]);
    expect(await lowReports()).toEqual([{ status: 'open', userId: null }]);

    // « Garder » in A-03: closed, it opens again only after 5 new ratings.
    await app.db
      .update(routeReports)
      .set({ status: 'rejected', reviewedAt: new Date() })
      .where(eq(routeReports.routeId, routeId));
    await rateLow([1, 1, 1, 1]);
    expect(await lowReports()).toHaveLength(1);
    await rateLow([1]);
    expect(await lowReports()).toEqual([
      { status: 'rejected', userId: null },
      { status: 'open', userId: null },
    ]);
  }, 30_000);

  it('erases the rating with the account and recomputes the route', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const kept = await fixtures.signIn({ firstName: 'Léa' });
    await rate(kept, (await outing(kept, routeId)).id, { rating: 4 });
    const leaving = await fixtures.signIn({ firstName: 'Hugo' });
    await rate(leaving, (await outing(leaving, routeId)).id, { rating: 2 });
    expect(await statsOf(routeId)).toEqual({ average: 3, count: 2 });
    await app.inject({ method: 'DELETE', url: '/v1/me', headers: leaving });
    expect(await statsOf(routeId)).toEqual({ average: 4, count: 1 });
  });
});
