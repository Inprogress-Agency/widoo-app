import { PlannedRoute, RouteRatingList } from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedSteps, routeRatings } from '../db/schema';
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

/** A new account named `firstName` rates `routeId` after a whole outing. */
async function review(routeId: string, firstName: string, rating: number, comment?: string) {
  const headers = await fixtures.signIn({ firstName });
  const created = await app.inject({
    method: 'POST',
    url: '/v1/me/planned',
    headers,
    payload: { routeId, startsAt: saturdayTen },
  });
  const { id } = PlannedRoute.parse(created.json());
  await app.inject({
    method: 'PATCH',
    url: `/v1/me/planned/${id}`,
    headers,
    payload: { status: 'in_progress' },
  });
  await app.db
    .update(plannedSteps)
    .set({ doneAt: new Date() })
    .where(eq(plannedSteps.plannedRouteId, id));
  await app.inject({
    method: 'PATCH',
    url: `/v1/me/planned/${id}`,
    headers,
    payload: { status: 'completed' },
  });
  const rated = await app.inject({
    method: 'POST',
    url: `/v1/me/planned/${id}/rating`,
    headers,
    payload: { rating, comment },
  });
  expect(rated.statusCode).toBe(200);
}

const reviewsOf = async (routeId: string, query = '') =>
  RouteRatingList.parse(
    (await app.inject({ url: `/v1/routes/${routeId}/ratings${query}` })).json(),
  );

describe('GET /v1/routes/:id/ratings', () => {
  it('lists the visible reviews, newest first, page by page', async () => {
    const routeId = await fixtures.copyDemoRoute();
    await review(routeId, 'Ana', 5, 'Avis de Ana');
    await review(routeId, 'Ben', 3);
    await review(routeId, 'Chloé', 4, 'Avis de Chloé');

    const first = await reviewsOf(routeId, '?limit=2');
    expect(first.items.map((item) => [item.firstName, item.rating, item.comment])).toEqual([
      ['Chloé', 4, 'Avis de Chloé'],
      ['Ben', 3, null],
    ]);
    const rest = await reviewsOf(routeId, `?limit=2&cursor=${first.nextCursor ?? ''}`);
    expect(rest).toMatchObject({ items: [{ firstName: 'Ana', rating: 5 }], nextCursor: null });
  });

  it('leaves out a review masked by a moderator', async () => {
    const routeId = await fixtures.copyDemoRoute();
    await review(routeId, 'Dan', 1, 'Masqué');
    await app.db
      .update(routeRatings)
      .set({ status: 'hidden' })
      .where(and(eq(routeRatings.routeId, routeId), eq(routeRatings.rating, 1)));
    expect((await reviewsOf(routeId)).items).toEqual([]);
  });

  it('answers 404 for a route offline, and 400 for a cursor that is not one', async () => {
    const draft = await fixtures.copyDemoRoute({ status: 'draft' });
    expect((await app.inject({ url: `/v1/routes/${draft}/ratings` })).statusCode).toBe(404);
    const routeId = await fixtures.copyDemoRoute();
    const response = await app.inject({ url: `/v1/routes/${routeId}/ratings?cursor=nope` });
    expect(response.statusCode).toBe(400);
  });
});
