import { ApiError, OwnRoute, type RouteStatus } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routeRevisions, routes, userFeaturedRoutes } from '../db/schema';
import { editorFixtures } from '../editor/test-fixtures';
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
const submit = (headers: Headers, id: string) =>
  app.inject({ method: 'POST', url: `/v1/routes/${id}/submit`, headers });
const setStatus = (headers: Headers, id: string, status: string) =>
  app.inject({ method: 'POST', url: `/v1/routes/${id}/status`, headers, payload: { status } });
const patch = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/routes/${id}`, headers, payload });
const rowOf = async (id: string) =>
  (await app.db.select().from(routes).where(eq(routes.id, id)))[0];
const force = (id: string, status: RouteStatus) =>
  app.db.update(routes).set({ status }).where(eq(routes.id, id));

/** A publishable route of a new account, already published, on the author's profile. */
async function publishedRoute() {
  const headers = await fixtures.signIn();
  const route = await fixtures.publishableDraft(headers);
  await force(route.id, 'published');
  const [row] = await app.db.select().from(routes).where(eq(routes.id, route.id));
  if (!row?.authorId) throw new Error('Route without author');
  await app.db
    .insert(userFeaturedRoutes)
    .values({ userId: row.authorId, routeId: route.id, position: 1 });
  return { headers, route };
}

describe('POST /routes/:id/submit', () => {
  it.each<RouteStatus>(['draft', 'private', 'changes_requested', 'needs_fix'])(
    'sends a %s route to moderation',
    async (status) => {
      const headers = await fixtures.signIn();
      const { id } = await fixtures.publishableDraft(headers);
      await force(id, status);
      const response = await submit(headers, id);
      expect(response.statusCode).toBe(200);
      expect(OwnRoute.parse(response.json())).toMatchObject({ status: 'pending', errors: [] });
      expect((await rowOf(id))?.status).toBe('pending');
    },
  );

  it.each<RouteStatus>(['pending', 'rejected', 'unpublished'])(
    'answers 409 to a %s route',
    async (status) => {
      const headers = await fixtures.signIn();
      const { id } = await fixtures.publishableDraft(headers);
      await force(id, status);
      const response = await submit(headers, id);
      expect(response.statusCode).toBe(409);
      expect(ApiError.parse(response.json())).toMatchObject({
        code: 'conflict',
        details: { status },
      });
    },
  );

  it('answers 422 coherence_blocked with the blocking rules, and leaves the draft', async () => {
    const headers = await fixtures.signIn();
    const created = await app.inject({ method: 'POST', url: '/v1/routes', headers, payload: {} });
    const { id } = OwnRoute.parse(created.json());
    const response = await submit(headers, id);
    expect(response.statusCode).toBe(422);
    const body = ApiError.parse(response.json());
    expect(body.code).toBe('coherence_blocked');
    expect(body.details?.errors).toEqual([
      { code: 'missing_title', stepPosition: null },
      { code: 'min_steps', stepPosition: null },
      { code: 'missing_description', stepPosition: null },
      { code: 'missing_photo', stepPosition: null },
    ]);
    expect((await rowOf(id))?.status).toBe('draft');
  });

  it('publishes the route of an editor at once, outside the limit', async () => {
    const headers = await fixtures.signIn('editor');
    const ids: string[] = [];
    for (let n = 0; n < 4; n += 1) ids.push((await fixtures.publishableDraft(headers)).id);
    for (const id of ids) {
      const response = await submit(headers, id);
      expect(OwnRoute.parse(response.json())).toMatchObject({
        status: 'published',
        isOfficial: true,
      });
    }
    expect((await rowOf(ids[0] ?? ''))?.publishedAt).toBeInstanceOf(Date);
  });

  it('answers 404 to anyone but the author', async () => {
    const { id } = await fixtures.publishableDraft(await fixtures.signIn());
    const other = await fixtures.signIn('editor');
    expect((await submit(other, id)).statusCode).toBe(404);
    expect((await setStatus(other, id, 'private')).statusCode).toBe(404);
    expect((await rowOf(id))?.status).toBe('draft');
  });
});

describe('the revision of a published route', () => {
  it('awaits moderation while the published version stays online', async () => {
    const { headers, route } = await publishedRoute();
    expect((await submit(headers, route.id)).statusCode).toBe(409);

    await patch(headers, route.id, { title: 'Le Marais revu' });
    const response = await submit(headers, route.id);
    expect(response.statusCode).toBe(200);
    expect(OwnRoute.parse(response.json())).toMatchObject({
      status: 'published',
      title: 'Le Marais revu',
      revision: { status: 'pending' },
    });
    expect(await rowOf(route.id)).toMatchObject({
      status: 'published',
      title: 'Les musées du Marais',
    });
    expect((await snapshotOf(app.db, route.id))?.title).toBe('Les musées du Marais');

    expect((await submit(headers, route.id)).statusCode).toBe(409);
    const edit = await patch(headers, route.id, { title: 'Encore' });
    expect(edit.statusCode).toBe(409);
    expect(ApiError.parse(edit.json()).details).toEqual({ revisionStatus: 'pending' });
  });

  it('is applied at once for an editor', async () => {
    const headers = await fixtures.signIn('editor');
    const { id } = await fixtures.publishableDraft(headers);
    await submit(headers, id);
    await patch(headers, id, { title: 'Signature revue' });
    const response = await submit(headers, id);
    expect(OwnRoute.parse(response.json())).toMatchObject({
      title: 'Signature revue',
      revision: null,
    });
    expect((await rowOf(id))?.title).toBe('Signature revue');
    const [revision] = await app.db
      .select()
      .from(routeRevisions)
      .where(eq(routeRevisions.routeId, id));
    expect(revision?.status).toBe('published');
  });
});

describe('POST /routes/:id/status', () => {
  it('saves a draft as private, with its link, and refuses the way back', async () => {
    const headers = await fixtures.signIn();
    const { id } = await fixtures.publishableDraft(headers);
    const response = await setStatus(headers, id, 'private');
    expect(response.statusCode).toBe(200);
    const route = OwnRoute.parse(response.json());
    expect(route.status).toBe('private');
    expect(route.shareToken).toEqual(expect.any(String));
    expect((await setStatus(headers, id, 'draft')).statusCode).toBe(409);
  });

  it('takes a refused route back as a draft', async () => {
    const headers = await fixtures.signIn();
    const { id } = await fixtures.publishableDraft(headers);
    await force(id, 'rejected');
    expect(OwnRoute.parse((await setStatus(headers, id, 'draft')).json()).status).toBe('draft');
  });

  it('withdraws a published route from the profile, with its open revision', async () => {
    const { headers, route } = await publishedRoute();
    await patch(headers, route.id, { title: 'Brouillon de révision' });
    const response = await setStatus(headers, route.id, 'unpublished');
    expect(OwnRoute.parse(response.json())).toMatchObject({
      status: 'unpublished',
      revision: null,
    });
    const featured = await app.db
      .select()
      .from(userFeaturedRoutes)
      .where(eq(userFeaturedRoutes.routeId, route.id));
    expect(featured).toEqual([]);
    expect(
      await app.db.select().from(routeRevisions).where(eq(routeRevisions.routeId, route.id)),
    ).toEqual([]);
  });

  it('answers 422 to a status the author does not set', async () => {
    const headers = await fixtures.signIn();
    const { id } = await fixtures.publishableDraft(headers);
    expect((await setStatus(headers, id, 'published')).statusCode).toBe(422);
  });
});
