import { ApiError, RouteDetail, type RouteStatus } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// On copies of the demo route « Marais gourmand », one per case: shared database, parallel files.
// Fictitious accounts and link tokens; everything is deleted afterwards.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
// One link token per copy: `share_token` is unique.
const tokens = new Map<string, string>();
const linkOf = (id: string) => tokens.get(id) ?? '';
const day = 24 * 60 * 60 * 1000;
let author: { headers: Record<string, string>; id: string };

/** A signed-in account and its id. */
async function account(values: Partial<typeof users.$inferInsert> = {}) {
  const headers = await fixtures.signIn(values);
  const me = await app.inject({ url: '/v1/me', headers });
  return { headers, id: me.json<{ id: string }>().id };
}

async function copy(status: RouteStatus, values: Partial<typeof routes.$inferInsert> = {}) {
  const shareToken = `Fictitious_${uuidv7().replaceAll('-', '')}`;
  const id = await fixtures.copyDemoRoute({ authorId: author.id, status, shareToken, ...values });
  tokens.set(id, shareToken);
  return id;
}
const get = (url: string, headers: Record<string, string> = {}) =>
  app.inject({ url: `/v1/routes/${url}`, headers });
const sheetOf = (body: string) => RouteDetail.parse(JSON.parse(body));

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier, directions: null });
  author = await account({ firstName: 'Camille' });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

describe('GET /v1/routes/:id, who reads what (D-093)', () => {
  it.each(['published', 'needs_fix'] as const)('serves a %s route to anyone', async (status) => {
    const id = await copy(status, { publishedAt: new Date() });
    for (const url of [id, `${id}?token=${linkOf(id)}`]) {
      const response = await get(url);
      expect(response.statusCode).toBe(200);
      expect(sheetOf(response.body)).toMatchObject({ id, status, sharedBy: null });
    }
  });

  it.each(['private', 'pending', 'changes_requested'] as const)(
    'serves a %s route never published with its link only, saying who shared it',
    async (status) => {
      const id = await copy(status, { publishedAt: null });
      expect((await get(id)).statusCode).toBe(404);
      const response = await get(`${id}?token=${linkOf(id)}`);
      expect(response.statusCode).toBe(200);
      expect(sheetOf(response.body)).toMatchObject({ status, sharedBy: { firstName: 'Camille' } });
    },
  );

  it('answers 404 to a pending route published once, even with its link (Q3)', async () => {
    const id = await copy('pending', { publishedAt: new Date(Date.now() - day) });
    expect((await get(`${id}?token=${linkOf(id)}`)).statusCode).toBe(404);
  });

  it.each(['draft', 'rejected'] as const)('answers 404 to a %s route, link or not', async (s) => {
    const id = await copy(s);
    expect((await get(id)).statusCode).toBe(404);
    expect((await get(`${id}?token=${linkOf(id)}`)).statusCode).toBe(404);
    expect((await get(id, author.headers)).statusCode).toBe(404);
  });

  it('answers the same 404, never 403, to a wrong token and to an unknown route', async () => {
    const id = await copy('private');
    const wrong = await get(`${id}?token=${linkOf(id).replace('F', 'G')}`);
    const unknown = await get('0192f0a0-0000-7000-8000-00000000dead');
    expect(wrong.statusCode).toBe(404);
    expect(wrong.json()).toEqual(unknown.json());
    expect(ApiError.parse(wrong.json()).code).toBe('not_found');
    expect(wrong.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['a malformed id', 'not-a-uuid'],
    ['an unknown key', '0192f0a0-0000-7000-8000-00000000dead?lang=fr'],
    ['another trips value', '0192f0a0-0000-7000-8000-00000000dead?trips=exact'],
  ])('answers 400 validation_error to %s', async (_, url) => {
    const response = await get(url);
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });

  it('answers 401 to a Firebase token the verifier refuses', async () => {
    const id = await copy('published');
    const response = await get(id, { authorization: 'Bearer fictitious-token' });
    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain(id);
  });

  it('serves the author their private route without its link, and nothing shared', async () => {
    const id = await copy('private');
    const response = await get(id, author.headers);
    expect(response.statusCode).toBe(200);
    expect(sheetOf(response.body)).toMatchObject({ status: 'private', sharedBy: null });
  });
});
