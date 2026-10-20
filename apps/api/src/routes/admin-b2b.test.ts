import { ApiError, B2bClient, B2bClients, type UserRole } from '@widoo/shared';
import { and, asc, eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, b2bClients, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: slugs carry a marker, routes are copies of the demo, accounts
// are new, and only those are listed, journaled or deleted here.
const verifier = new TestTokenVerifier();
const teamUids: string[] = [];
const marker = `b2bt${uuidv7().slice(-8)}`;
let slugCount = 0;
const slugOf = (name: string) => `${marker}-${name}-${(slugCount += 1)}`;

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  const mine = await app.db
    .select({ id: b2bClients.id })
    .from(b2bClients)
    .where(like(b2bClients.slug, `${marker}-%`));
  const ids = mine.map((row) => row.id);
  if (ids.length > 0) {
    await app.db.delete(adminActions).where(inArray(adminActions.targetId, ids));
    await app.db.delete(b2bClients).where(inArray(b2bClients.id, ids));
  }
  await fixtures.cleanUp();
  await app.db.delete(users).where(inArray(users.firebaseUid, teamUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  teamUids.push(uid);
  const [user] = await app.db.insert(users).values({ firebaseUid: uid, role }).returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

type Headers = Record<string, string>;
const send = (
  method: 'GET' | 'POST' | 'PATCH' | 'PUT',
  headers: Headers,
  url: string,
  payload?: object,
) => app.inject({ method, url: `/v1/admin/b2b-clients${url}`, headers, payload });
// In the order it was written: without an `order by`, Postgres answers in any order.
const journalOf = async (targetId: string) =>
  (
    await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, targetId))
      .orderBy(asc(adminActions.createdAt), asc(adminActions.id))
  ).map((row) => row.action);

/** A partner created by the API, with the card it answered. */
async function addPartner(headers: Headers, values: Record<string, unknown> = {}) {
  const response = await send('POST', headers, '', {
    slug: slugOf('hotel'),
    name: `Hôtel ${marker}`,
    type: 'hotel',
    ...values,
  });
  expect(response.statusCode).toBe(201);
  return B2bClient.parse(response.json());
}

const publishedRoute = () => fixtures.copyDemoRoute({ status: 'published' });

describe('who may read and write the partners', () => {
  it('is for editors and admins, not for a moderator, nor for someone signed out', async () => {
    const editor = await signIn('editor');
    const admin = await signIn('admin');
    const moderator = await signIn('moderator');

    expect((await send('GET', editor.headers, '')).statusCode).toBe(200);
    expect((await send('GET', admin.headers, '')).statusCode).toBe(200);
    expect((await send('GET', moderator.headers, '')).statusCode).toBe(403);
    expect(
      (await send('POST', moderator.headers, '', { slug: 'x-y-z', name: 'X', type: 'hotel' }))
        .statusCode,
    ).toBe(403);
    expect((await app.inject({ url: '/v1/admin/b2b-clients' })).statusCode).toBe(401);
  });
});

describe('POST /v1/admin/b2b-clients', () => {
  it('registers a prospect with its source of measure, and journals it', async () => {
    const editor = await signIn('editor');
    const slug = slugOf('nord');

    const created = await addPartner(editor.headers, {
      slug,
      contactEmail: 'camille@hotel.example',
      monthlyPriceCents: 4900,
    });

    expect(created).toMatchObject({
      slug,
      status: 'prospect',
      source: `b2b-${slug}`,
      contactEmail: 'camille@hotel.example',
      monthlyPriceCents: 4900,
      routes: [],
      routeCount: 0,
      cityNames: [],
    });
    expect(await journalOf(created.id)).toEqual(['b2b_client.create']);
  });

  it('refuses a slug already used, a bad slug, markup and an unknown field', async () => {
    const editor = await signIn('editor');
    const first = await addPartner(editor.headers);

    const again = await send('POST', editor.headers, '', {
      slug: first.slug,
      name: 'Autre',
      type: 'other',
    });
    expect(again.statusCode).toBe(409);
    expect(ApiError.parse(again.json()).details).toEqual({ reason: 'slug_taken' });
    for (const payload of [
      { slug: 'Bad Slug', name: 'X', type: 'hotel' },
      { slug: slugOf('x'), name: '<b>x</b>', type: 'hotel' },
      { slug: slugOf('y'), name: 'Y', type: 'hotel', extra: 1 },
    ]) {
      expect((await send('POST', editor.headers, '', payload)).statusCode).toBe(422);
    }
  });
});

describe('PATCH /v1/admin/b2b-clients/:id', () => {
  it('changes the fields given, keeps the others, and journals the before and after', async () => {
    const admin = await signIn('admin');
    const created = await addPartner(admin.headers, { notes: 'À rappeler' });

    const response = await send('PATCH', admin.headers, `/${created.id}`, {
      status: 'active',
      monthlyPriceCents: 6000,
      startedAt: '2026-11-01',
    });

    expect(response.statusCode).toBe(200);
    expect(B2bClient.parse(response.json())).toMatchObject({
      status: 'active',
      monthlyPriceCents: 6000,
      startedAt: '2026-11-01',
      notes: 'À rappeler',
      slug: created.slug,
    });
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(
        and(eq(adminActions.targetId, created.id), eq(adminActions.action, 'b2b_client.update')),
      );
    expect(entry).toMatchObject({
      actorId: admin.id,
      before: { status: 'prospect', monthlyPriceCents: null, startedAt: null },
      after: { status: 'active', monthlyPriceCents: 6000, startedAt: '2026-11-01' },
    });
  });

  it('refuses the slug, an empty change, and answers 404 to an unknown partner', async () => {
    const admin = await signIn('admin');
    const created = await addPartner(admin.headers);

    expect(
      (await send('PATCH', admin.headers, `/${created.id}`, { slug: 'new-slug' })).statusCode,
    ).toBe(422);
    expect((await send('PATCH', admin.headers, `/${created.id}`, {})).statusCode).toBe(422);
    expect((await send('PATCH', admin.headers, `/${uuidv7()}`, { name: 'X' })).statusCode).toBe(
      404,
    );
    expect((await send('GET', admin.headers, `/${uuidv7()}`)).statusCode).toBe(404);
  });
});

describe('PUT /v1/admin/b2b-clients/:id/routes', () => {
  it('sets 3 to 10 published routes in order, replaces them, and lists them', async () => {
    const editor = await signIn('editor');
    const partner = await addPartner(editor.headers);
    const [a, b, c, d] = await Promise.all([1, 2, 3, 4].map(publishedRoute));
    if (!a || !b || !c || !d) throw new Error('Routes not created');

    const set = await send('PUT', editor.headers, `/${partner.id}/routes`, { routeIds: [c, a, b] });

    expect(set.statusCode).toBe(200);
    const card = B2bClient.parse(set.json());
    expect(card.routes.map((route) => [route.id, route.position, route.isPublished])).toEqual([
      [c, 0, true],
      [a, 1, true],
      [b, 2, true],
    ]);
    expect(card.routeCount).toBe(3);
    expect(card.cityNames.length).toBeGreaterThan(0);

    const replaced = await send('PUT', editor.headers, `/${partner.id}/routes`, {
      routeIds: [d, b, a],
    });
    expect(B2bClient.parse(replaced.json()).routes.map((route) => route.id)).toEqual([d, b, a]);
    const listed = B2bClients.parse((await send('GET', editor.headers, '')).json());
    expect(listed.items.find((item) => item.id === partner.id)).toMatchObject({ routeCount: 3 });
    expect(await journalOf(partner.id)).toEqual([
      'b2b_client.create',
      'b2b_client.set_routes',
      'b2b_client.set_routes',
    ]);
  });

  it('refuses fewer than 3 routes, a route twice, and routes that are not published', async () => {
    const editor = await signIn('editor');
    const partner = await addPartner(editor.headers);
    const [a, b, c] = await Promise.all([1, 2, 3].map(publishedRoute));
    const draft = await fixtures.copyDemoRoute({ status: 'draft' });
    if (!a || !b || !c) throw new Error('Routes not created');
    const unknown = uuidv7();

    expect(
      (await send('PUT', editor.headers, `/${partner.id}/routes`, { routeIds: [a, b] })).statusCode,
    ).toBe(422);
    expect(
      (await send('PUT', editor.headers, `/${partner.id}/routes`, { routeIds: [a, b, b] }))
        .statusCode,
    ).toBe(422);
    const refused = await send('PUT', editor.headers, `/${partner.id}/routes`, {
      routeIds: [a, draft, unknown],
    });
    expect(refused.statusCode).toBe(409);
    expect(ApiError.parse(refused.json()).details).toEqual({
      reason: 'routes_unavailable',
      routeIds: [draft, unknown],
    });
    expect(
      (await send('PUT', editor.headers, `/${uuidv7()}/routes`, { routeIds: [a, b, c] }))
        .statusCode,
    ).toBe(404);
    const card = B2bClient.parse((await send('GET', editor.headers, `/${partner.id}`)).json());
    expect(card.routes).toEqual([]);
  });
});
