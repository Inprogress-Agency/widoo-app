import { ApiError, maxPendingRoutesKey, type RouteStatus } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routeRevisions, routes, settings } from '../db/schema';
import { editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';

// Through `POST /routes/:id/submit`, which calls `assertPendingRoom` in its transaction. Shared
// database, parallel files: the accounts and routes made here are deleted by the fixtures, and
// the `settings` row of the limit, which no other file writes (a lower limit set here for a
// moment refuses nothing to the other files, whose authors submit one route at a time).
let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = editorFixtures(() => app, verifier);

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterEach(async () => {
  await app.db.delete(settings).where(eq(settings.key, maxPendingRoutesKey));
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

/** A new account with one publishable route per status given. */
async function authorWith(statuses: RouteStatus[]) {
  const headers = await fixtures.signIn();
  const ids: string[] = [];
  for (const status of statuses) {
    const { id } = await fixtures.publishableDraft(headers);
    await app.db.update(routes).set({ status }).where(eq(routes.id, id));
    ids.push(id);
  }
  return { headers, ids };
}

const submit = (headers: Record<string, string>, id = '') =>
  app.inject({ method: 'POST', url: `/v1/routes/${id}/submit`, headers });
const statusOf = async (id = '') =>
  (await app.db.select({ status: routes.status }).from(routes).where(eq(routes.id, id)))[0]?.status;

describe('max_pending_routes (D-073)', () => {
  it('answers 429 rate_limited to the fourth submission, and leaves the route a draft', async () => {
    const { headers, ids } = await authorWith(['draft', 'draft', 'draft', 'draft']);
    const [first, second, third, fourth] = ids;
    for (const id of [first, second, third]) {
      expect((await submit(headers, id)).statusCode).toBe(200);
    }
    const refused = await submit(headers, fourth);
    expect(refused.statusCode).toBe(429);
    expect(ApiError.parse(refused.json())).toEqual({
      code: 'rate_limited',
      message: 'Too many routes awaiting moderation',
      details: { reason: 'pending_routes', limit: 3 },
    });
    expect(await statusOf(fourth)).toBe('draft');
  });

  it('frees the place of a route that leaves the moderation', async () => {
    const { headers, ids } = await authorWith(['pending', 'pending', 'pending', 'draft']);
    const [pending = '', , , draft] = ids;
    expect((await submit(headers, draft)).statusCode).toBe(429);
    await app.db.update(routes).set({ status: 'published' }).where(eq(routes.id, pending));
    expect((await submit(headers, draft)).statusCode).toBe(200);
  });

  it('counts the revision of a published route awaiting moderation', async () => {
    const { headers, ids } = await authorWith(['pending', 'pending', 'published', 'draft']);
    const [, , published = '', draft] = ids;
    await app.db
      .insert(routeRevisions)
      .values({ routeId: published, status: 'pending', snapshot: {} });
    expect((await submit(headers, draft)).statusCode).toBe(429);
  });

  it('counts neither the routes of other accounts nor the other statuses', async () => {
    await authorWith(['pending', 'pending', 'pending']);
    const { headers, ids } = await authorWith(['draft', 'private', 'unpublished', 'rejected']);
    expect((await submit(headers, ids[0])).statusCode).toBe(200);
  });

  it('reads the limit from settings on each submission, without a restart', async () => {
    const { headers, ids } = await authorWith(['draft', 'draft']);
    await app.db.insert(settings).values({ key: maxPendingRoutesKey, value: 1 });
    expect((await submit(headers, ids[0])).statusCode).toBe(200);
    const refused = await submit(headers, ids[1]);
    expect(refused.statusCode).toBe(429);
    expect(ApiError.parse(refused.json()).details).toEqual({ reason: 'pending_routes', limit: 1 });
  });

  it('lets only one of two submissions at once take the last place', async () => {
    const { headers, ids } = await authorWith(['pending', 'pending', 'draft', 'draft']);
    const [, , first, second] = ids;
    const codes = (await Promise.all([submit(headers, first), submit(headers, second)])).map(
      (response) => response.statusCode,
    );
    expect(codes.toSorted()).toEqual([200, 429]);
  });
});
