import { ApiError, OwnRoute } from '@widoo/shared';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routeRevisions, routes, steps } from '../db/schema';
import { RouteContent } from '../editor/content';
import { demoPlaceIds, editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';

// The fields of the editor added by migration 0013 (#176: D-048, D-049, D-050).
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
const create = (headers: Headers) =>
  app.inject({ method: 'POST', url: '/v1/routes', headers, payload: { title: 'Marais' } });
const patch = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/routes/${id}`, headers, payload });
const putSteps = (headers: Headers, id: string, stepList: object[]) =>
  app.inject({
    method: 'PUT',
    url: `/v1/routes/${id}/steps`,
    headers,
    payload: { steps: stepList },
  });
const read = async (headers: Headers, id: string) =>
  OwnRoute.parse((await app.inject({ url: `/v1/me/routes/${id}`, headers })).json());

const information = {
  suggestedStart: '10:30',
  tips: ['Des espèces', 'Une gourde'],
  tipsHidden: ['comfy_shoes'],
};
const booked = {
  placeId: demoPlaceIds[0],
  durationMin: 45,
  bookingRequired: true,
  bookingUrl: 'https://example.com/reserver',
  bookingNote: 'Créneau du matin, moins de monde',
  bookingIsAffiliate: true,
  endsOn: '2027-01-17',
};

describe('the information of a route (E-11)', () => {
  it('stores the suggested start, the tips and the hidden suggestions', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    expect(await read(headers, id)).toMatchObject({
      suggestedStart: null,
      tips: [],
      tipsHidden: [],
    });

    const response = await patch(headers, id, information);
    expect(response.statusCode).toBe(200);
    expect(OwnRoute.parse(response.json())).toMatchObject(information);
    const [row] = await app.db.select().from(routes).where(eq(routes.id, id));
    expect(row).toMatchObject({ ...information, suggestedStart: '10:30:00' });
    expect(await read(headers, id)).toMatchObject(information);

    const cleared = await patch(headers, id, { suggestedStart: null, tips: [] });
    expect(OwnRoute.parse(cleared.json())).toMatchObject({ suggestedStart: null, tips: [] });
  });
});

describe('the steps of a route (E-12)', () => {
  it('store the booking note, the affiliate link and the last day of a step', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    const response = await putSteps(headers, id, [
      booked,
      { placeId: demoPlaceIds[1], durationMin: 30 },
    ]);
    expect(response.statusCode).toBe(200);
    const [first, second] = OwnRoute.parse(response.json()).steps;
    expect(first).toMatchObject(booked);
    expect(second).toMatchObject({ bookingNote: null, bookingIsAffiliate: false, endsOn: null });
    const rows = await app.db
      .select()
      .from(steps)
      .where(eq(steps.routeId, id))
      .orderBy(asc(steps.position));
    expect(rows[0]).toMatchObject({ bookingNote: booked.bookingNote, endsOn: booked.endsOn });
  });

  it('answer 422 to an affiliate link without its booking link', async () => {
    const headers = await fixtures.signIn();
    const { id } = OwnRoute.parse((await create(headers)).json());
    const response = await putSteps(headers, id, [{ ...booked, bookingUrl: null }]);
    expect(response.statusCode).toBe(422);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });
});

describe('a published route under revision', () => {
  it('keeps the new fields in the revision, then publishes them', async () => {
    const headers = await fixtures.signIn('editor');
    const draft = await fixtures.publishableDraft(headers);
    await app.db.update(routes).set({ status: 'published' }).where(eq(routes.id, draft.id));

    await patch(headers, draft.id, information);
    const kept = draft.steps.map(({ id, placeId, durationMin }) => ({ id, placeId, durationMin }));
    await putSteps(headers, draft.id, [{ ...booked, id: kept[0]?.id }, ...kept.slice(1)]);
    const [published] = await app.db.select().from(routes).where(eq(routes.id, draft.id));
    expect(published).toMatchObject({ suggestedStart: null, tips: [] });
    expect(await read(headers, draft.id)).toMatchObject(information);

    const submitted = await app.inject({
      method: 'POST',
      url: `/v1/routes/${draft.id}/submit`,
      headers,
    });
    expect(submitted.statusCode).toBe(200);
    const [row] = await app.db.select().from(routes).where(eq(routes.id, draft.id));
    expect(row).toMatchObject({ tips: information.tips, suggestedStart: '10:30:00' });
    const [step] = await app.db
      .select()
      .from(steps)
      .where(eq(steps.routeId, draft.id))
      .orderBy(asc(steps.position))
      .limit(1);
    expect(step).toMatchObject({ bookingIsAffiliate: true, endsOn: booked.endsOn });
  });

  it('reads a revision saved before these fields', async () => {
    const headers = await fixtures.signIn();
    const draft = await fixtures.publishableDraft(headers);
    await app.db.update(routes).set({ status: 'published' }).where(eq(routes.id, draft.id));
    const oldSnapshot = {
      title: 'Ancienne révision',
      description: null,
      moods: [],
      audiences: [],
      conditions: [],
      steps: [],
    };
    await app.db.insert(routeRevisions).values({ routeId: draft.id, snapshot: oldSnapshot });
    expect(RouteContent.parse(oldSnapshot)).toMatchObject({ suggestedStart: null, tips: [] });
    expect(await read(headers, draft.id)).toMatchObject({
      title: 'Ancienne révision',
      suggestedStart: null,
      tips: [],
      tipsHidden: [],
    });
  });
});
