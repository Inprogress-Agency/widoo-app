import { ApiError, B2bClient, type UserRole } from '@widoo/shared';
import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, b2bClients, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: slugs carry a marker, routes are copies of the demo, accounts
// are new, and only those are listed, journaled or deleted here.
const verifier = new TestTokenVerifier();
const teamUids: string[] = [];
const marker = `b2bt${uuidv7().slice(-8)}`;
let slugCount = 0;
const slugOf = (name: string) => `${marker}-${name}-${(slugCount += 1)}`;

let app: Awaited<ReturnType<typeof buildApp>>;
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
const journalOf = async (targetId: string) =>
  (await app.db.select().from(adminActions).where(eq(adminActions.targetId, targetId))).map(
    (row) => row.action,
  );

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
