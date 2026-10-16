import { PlannedRoute, PlannedRouteList } from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media, plannedRoutes, steps } from '../db/schema';
import { plannedFixtures, saturdayTen } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// « À ne pas manquer » and « En images » of E-07 (D-029, D-052), on a copy of the demo route:
// fictitious credits of the seed, deleted with the copy.
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

async function planCopy() {
  const headers = await fixtures.signIn();
  const routeId = await fixtures.copyDemoRoute({}, { stepPhotos: true });
  const response = await app.inject({
    method: 'POST',
    url: '/v1/me/planned',
    headers,
    payload: { routeId, startsAt: saturdayTen },
  });
  return { headers, routeId, planned: PlannedRoute.parse(response.json()) };
}

describe('the steps of a planning (E-07)', () => {
  it('carry their points and photos with the credit of a free photo, on both reads', async () => {
    const { headers, planned } = await planCopy();
    const read = PlannedRoute.parse(
      (await app.inject({ url: `/v1/me/planned/${planned.id}`, headers })).json(),
    );
    const [listed] = PlannedRouteList.parse(
      (await app.inject({ url: '/v1/me/planned', headers })).json(),
    ).items;

    expect(listed?.id).toBe(planned.id);
    for (const { route } of [read, listed ?? read]) {
      const [merci, fallafel, village, berthillon] = route.steps;
      expect(merci?.highlights).toHaveLength(3);
      expect(merci?.photos).toEqual([
        { url: expect.stringMatching(/^https:\/\/images\.unsplash\.com\//), credit: null },
        {
          url: expect.stringMatching(/^https:\/\//),
          credit: {
            author: 'J. Moreau',
            license: 'CC BY-SA 4.0',
            sourceUrl: 'https://example.com/commons/cour-du-marais',
          },
        },
      ]);
      expect(fallafel?.photos[0]?.credit?.author).toBe('A. Martin');
      expect(village).toMatchObject({ highlights: [], photos: [] });
      expect(berthillon).toMatchObject({ highlights: expect.any(Array), photos: [] });
    }
  });

  it('keeps the photos it froze once the creator removes them', async () => {
    const { headers, routeId, planned } = await planCopy();
    const stepIds = (await app.db.select().from(steps).where(eq(steps.routeId, routeId))).map(
      (step) => step.id,
    );
    await app.db
      .delete(media)
      .where(and(eq(media.ownerType, 'step'), inArray(media.ownerId, stepIds)));

    const read = PlannedRoute.parse(
      (await app.inject({ url: `/v1/me/planned/${planned.id}`, headers })).json(),
    );
    expect(read.route.steps[0]?.photos).toEqual(planned.route.steps[0]?.photos);
  });

  it('reads a planning saved before them as without points nor photos', async () => {
    const { headers, planned } = await planCopy();
    const [row] = await app.db.select().from(plannedRoutes).where(eq(plannedRoutes.id, planned.id));
    const { steps: frozen, ...route } = row?.routeRevisionSnapshot as typeof planned.route;
    // As written before #508: the steps without their points nor photos.
    const added = new Set(['highlights', 'photos']);
    const before = frozen.map((step) =>
      Object.fromEntries(Object.entries(step).filter(([key]) => !added.has(key))),
    );
    await app.db
      .update(plannedRoutes)
      .set({ routeRevisionSnapshot: { ...route, steps: before } })
      .where(eq(plannedRoutes.id, planned.id));

    const response = await app.inject({ url: `/v1/me/planned/${planned.id}`, headers });
    expect(response.statusCode).toBe(200);
    const read = PlannedRoute.parse(response.json());
    expect(read.route.steps.map(({ highlights, photos }) => [highlights, photos])).toEqual(
      before.map(() => [[], []]),
    );
  });
});
