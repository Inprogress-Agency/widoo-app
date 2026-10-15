import { ApiError, OwnRoute } from '@widoo/shared';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes, steps } from '../db/schema';
import { demoPlaceIds, editorFixtures, publishableDescription } from '../editor/test-fixtures';
import { snapshotOf } from '../planned/snapshot';
import { testConfig } from '../test-config';

let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = editorFixtures(() => app, verifier);

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

type Headers = Record<string, string>;
const create = (headers: Headers, payload: object = {}) =>
  app.inject({ method: 'POST', url: '/v1/routes', headers, payload });
const patch = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/routes/${id}`, headers, payload });
const putSteps = (headers: Headers, id: string, stepList: object[]) =>
  app.inject({
    method: 'PUT',
    url: `/v1/routes/${id}/steps`,
    headers,
    payload: { steps: stepList },
  });
const read = (headers: Headers, id: string) => app.inject({ url: `/v1/me/routes/${id}`, headers });
const rowOf = async (id: string) =>
  (await app.db.select().from(routes).where(eq(routes.id, id)))[0];

describe('PATCH /routes/:id', () => {
  it('changes the information given, and keeps the rest', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers, { title: 'Brouillon' })).json());
    const response = await patch(headers, id, {
      description: publishableDescription,
      moods: ['food', 'culture'],
      conditions: ['wheelchair'],
    });
    expect(response.statusCode).toBe(200);
    expect(OwnRoute.parse(response.json())).toMatchObject({
      title: 'Brouillon',
      description: publishableDescription,
      moods: ['food', 'culture'],
      conditions: ['wheelchair'],
    });
    expect((await rowOf(id))?.moods).toEqual(['food', 'culture']);
  });

  it('answers 422 to an invalid body', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    const response = await patch(headers, id, { title: 'x'.repeat(61) });
    expect(response.statusCode).toBe(422);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });
});

describe('PUT /routes/:id/steps', () => {
  it('stores the steps, their estimated trips and what is derived, and answers the result', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers, { title: 'Marais' })).json());
    const response = await putSteps(
      headers,
      id,
      demoPlaceIds.map((placeId, index) => ({
        placeId,
        durationMin: 45,
        costPerPersonEur: index === 0 ? 0 : 12.5,
        highlights: index === 0 ? ['La chambre chinoise'] : null,
      })),
    );
    expect(response.statusCode).toBe(200);
    const route = OwnRoute.parse(response.json());
    expect(route.steps.map((step) => step.place.id)).toEqual(demoPlaceIds);
    expect(route.steps[0]).toMatchObject({ position: 0, highlights: ['La chambre chinoise'] });
    expect(route.steps[0]?.transition).toMatchObject({ mode: 'walk', estimated: true });
    expect(route.steps[2]?.transition).toBeNull();
    expect(route.computed).toMatchObject({ budgetPerPersonEur: 25, effort: 'easy' });
    expect(route.errors.map((issue) => [issue.code, issue.stepPosition])).toEqual([
      ['missing_step_photo', 0],
      ['missing_step_photo', 1],
      ['missing_step_photo', 2],
      ['missing_description', null],
      ['missing_photo', null],
    ]);

    const row = await rowOf(id);
    expect(row).toMatchObject({ transport: 'walk', budgetBucket: 'low' });
    expect(row?.startLocation).not.toBeNull();
    expect(row?.computed).toMatchObject({
      duration_min: route.computed?.durationMin,
      budget_per_person_eur: 25,
    });
  });

  it('keeps the id of a step given back, so its photos stay, and reorders the rest', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    const first = OwnRoute.parse(
      (await putSteps(headers, id, [{ placeId: demoPlaceIds[0], durationMin: 30 }])).json(),
    );
    const kept = first.steps[0]?.id;
    const second = OwnRoute.parse(
      (
        await putSteps(headers, id, [
          { placeId: demoPlaceIds[1], durationMin: 30, transitionMode: 'bike' },
          { id: kept, placeId: demoPlaceIds[0], durationMin: 60 },
        ])
      ).json(),
    );
    expect(second.steps.map((step) => step.id)[1]).toBe(kept);
    expect(second.steps[0]?.transition?.mode).toBe('bike');
    const stored = await app.db
      .select({ id: steps.id, durationMin: steps.durationMin })
      .from(steps)
      .where(eq(steps.routeId, id))
      .orderBy(asc(steps.position));
    expect(stored[1]).toEqual({ id: kept, durationMin: 60 });
    expect((await rowOf(id))?.transport).toBe('bike');
  });

  // Criterion of #180: the access follows the first step (D-050).
  it('computes the access of the first step, again when the first step changes', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    const [victorHugo, carnavalet] = demoPlaceIds;
    const accessOf = async () => ((await rowOf(id))?.computed as { access: unknown }).access;

    await putSteps(headers, id, [
      { placeId: victorHugo, durationMin: 30 },
      { placeId: carnavalet, durationMin: 30 },
    ]);
    expect(await accessOf()).toEqual({
      station: 'Bastille',
      lines: ['1', '5', '8'].map((line) => ({ mode: 'metro', line })),
      distance_m: 316,
    });

    await putSteps(headers, id, [
      { placeId: carnavalet, durationMin: 30 },
      { placeId: victorHugo, durationMin: 30 },
    ]);
    expect(await accessOf()).toEqual({
      station: 'Saint-Paul',
      lines: [{ mode: 'metro', line: '1' }],
      distance_m: 333,
    });
  });

  it('answers 422 to the step of another route, or a place that does not exist', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    const response = await putSteps(headers, id, [
      { id: '01997a4e-8c00-7000-8000-00000000ffff', placeId: demoPlaceIds[0], durationMin: 30 },
      { placeId: '01997a4e-8c00-7000-8000-00000000fffe', durationMin: 30 },
    ]);
    expect(response.statusCode).toBe(422);
    const issues = ApiError.parse(response.json()).details?.issues;
    expect(issues).toMatchObject([
      { path: 'steps.0.id', code: 'unknown_step' },
      { path: 'steps.1.placeId', code: 'unknown_place' },
    ]);
  });
});

describe('a route of another account', () => {
  it('answers 404 to anyone but its author, without writing', async () => {
    const { id } = OwnRoute.parse(
      (await create(await fixtures.signIn(), { title: 'À moi' })).json(),
    );
    const other = await fixtures.signIn('admin');
    expect((await read(other, id)).statusCode).toBe(404);
    expect((await patch(other, id, { title: 'Volé' })).statusCode).toBe(404);
    expect((await putSteps(other, id, [])).statusCode).toBe(404);
    expect((await rowOf(id))?.title).toBe('À moi');
  });
});

describe('a published route edited by its author', () => {
  it('keeps its published version online, the edits going to a revision', async () => {
    const headers = await fixtures.signIn();
    const draft = await fixtures.publishableDraft(headers);
    await app.db.update(routes).set({ status: 'published' }).where(eq(routes.id, draft.id));

    const edited = await patch(headers, draft.id, { title: 'Nouveau titre' });
    expect(OwnRoute.parse(edited.json())).toMatchObject({
      status: 'published',
      title: 'Nouveau titre',
      revision: { status: 'draft' },
    });
    const reordered = await putSteps(headers, draft.id, [
      { placeId: demoPlaceIds[2], durationMin: 30 },
    ]);
    expect(OwnRoute.parse(reordered.json()).steps).toHaveLength(1);

    expect((await rowOf(draft.id))?.title).toBe('Les musées du Marais');
    const published = await snapshotOf(app.db, draft.id);
    expect(published?.title).toBe('Les musées du Marais');
    expect(published?.steps.map((step) => step.id)).toEqual(draft.steps.map((step) => step.id));
    expect(OwnRoute.parse((await read(headers, draft.id)).json()).title).toBe('Nouveau titre');
  });

  it('refuses any edit while the route awaits moderation, or once refused', async () => {
    const headers = await fixtures.signIn();
    for (const status of ['pending', 'rejected', 'unpublished'] as const) {
      const { id } = OwnRoute.parse((await create(headers)).json());
      await app.db.update(routes).set({ status }).where(eq(routes.id, id));
      const response = await patch(headers, id, { title: 'Modifié' });
      expect(response.statusCode).toBe(409);
      expect(ApiError.parse(response.json())).toMatchObject({
        code: 'conflict',
        details: { status },
      });
    }
  });
});
