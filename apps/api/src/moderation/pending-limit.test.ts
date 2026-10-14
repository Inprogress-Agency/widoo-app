import { ApiError, maxPendingRoutesKey, type RouteStatus } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes, settings, users } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';
import { assertPendingRoom } from './pending-limit';

// The submission is #48's: a test-only route stands for it, the check then the move to `pending`
// in one transaction. Shared database, parallel files: only the accounts and routes made here
// are deleted, and the `settings` row of the limit, which no other file writes.
let app: Awaited<ReturnType<typeof buildApp>>;
let cityId: string;
const authorIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: new TestTokenVerifier() });
  app.post<{ Params: { id: string } }>('/v1/test/routes/:id/submit', async (request) => {
    const { id } = request.params;
    await app.db.transaction(async (tx) => {
      const [route] = await tx
        .select({ authorId: routes.authorId })
        .from(routes)
        .where(eq(routes.id, id));
      if (!route?.authorId) throw new Error('Test route without author');
      await assertPendingRoom(tx, route.authorId, id);
      await tx.update(routes).set({ status: 'pending' }).where(eq(routes.id, id));
    });
    return { ok: true };
  });
  await app.ready();
  ({ cityId } = await seed(app.db));
});
afterEach(async () => {
  await app.db.delete(settings).where(eq(settings.key, maxPendingRoutesKey));
});
afterAll(async () => {
  if (authorIds.length > 0) {
    await app.db.delete(routes).where(inArray(routes.authorId, authorIds));
    await app.db.delete(users).where(inArray(users.id, authorIds));
  }
  await app.close();
});

/** A free account with one route per status given, fictitious titles. */
async function authorWith(statuses: RouteStatus[]) {
  const [author] = await app.db
    .insert(users)
    .values({ firebaseUid: `fictitious-${uuidv7()}` })
    .returning({ id: users.id });
  if (!author) throw new Error('Author not created');
  authorIds.push(author.id);
  const rows = await app.db
    .insert(routes)
    .values(statuses.map((status) => ({ cityId, authorId: author.id, status, title: 'Fictif' })))
    .returning({ id: routes.id });
  return rows.map((row) => row.id);
}

const submit = (id: string) => app.inject({ method: 'POST', url: `/v1/test/routes/${id}/submit` });
const statusOf = async (id: string) =>
  (await app.db.select({ status: routes.status }).from(routes).where(eq(routes.id, id)))[0]?.status;

describe('assertPendingRoom (max_pending_routes, D-073)', () => {
  it('answers 429 rate_limited to the fourth submission, and leaves the route a draft', async () => {
    const [first, second, third, fourth = ''] = await authorWith([
      'draft',
      'draft',
      'draft',
      'draft',
    ]);
    for (const id of [first, second, third]) {
      expect((await submit(id ?? '')).statusCode).toBe(200);
    }
    const refused = await submit(fourth);
    expect(refused.statusCode).toBe(429);
    expect(ApiError.parse(refused.json())).toEqual({
      code: 'rate_limited',
      message: 'Too many routes awaiting moderation',
      details: { reason: 'pending_routes', limit: 3 },
    });
    expect(await statusOf(fourth)).toBe('draft');
  });

  it('frees the place of a route that leaves the moderation', async () => {
    const [pending = '', , , draft = ''] = await authorWith([
      'pending',
      'pending',
      'pending',
      'draft',
    ]);
    expect((await submit(draft)).statusCode).toBe(429);
    await app.db.update(routes).set({ status: 'published' }).where(eq(routes.id, pending));
    expect((await submit(draft)).statusCode).toBe(200);
  });

  it('counts neither the routes of other accounts nor the other statuses', async () => {
    await authorWith(['pending', 'pending', 'pending']);
    const [draft = ''] = await authorWith(['draft', 'private', 'published', 'unpublished']);
    expect((await submit(draft)).statusCode).toBe(200);
  });

  it('reads the limit from settings on each submission, without a restart', async () => {
    const [first = '', second = ''] = await authorWith(['draft', 'draft']);
    await app.db.insert(settings).values({ key: maxPendingRoutesKey, value: 1 });
    expect((await submit(first)).statusCode).toBe(200);
    const refused = await submit(second);
    expect(refused.statusCode).toBe(429);
    expect(ApiError.parse(refused.json()).details).toEqual({ reason: 'pending_routes', limit: 1 });
  });

  it('lets only one of two submissions at once take the last place', async () => {
    const [, , first = '', second = ''] = await authorWith([
      'pending',
      'pending',
      'draft',
      'draft',
    ]);
    const codes = (await Promise.all([submit(first), submit(second)])).map((r) => r.statusCode);
    expect(codes.toSorted()).toEqual([200, 429]);
  });
});
