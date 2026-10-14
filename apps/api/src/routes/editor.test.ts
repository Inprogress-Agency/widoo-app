import { OwnRoute } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { editorFixtures } from '../editor/test-fixtures';
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
const read = (headers: Headers, id: string) => app.inject({ url: `/v1/me/routes/${id}`, headers });

describe('POST /routes', () => {
  it('creates an untitled draft, without limit, its blocking rules listed', async () => {
    const headers = await fixtures.signIn();
    const response = await create(headers);
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    const route = OwnRoute.parse(response.json());
    expect(route).toMatchObject({
      status: 'draft',
      title: null,
      isOfficial: false,
      shareToken: null,
      revision: null,
      steps: [],
      computed: null,
      warnings: [],
    });
    expect(route.errors.map((issue) => issue.code)).toEqual([
      'missing_title',
      'min_steps',
      'missing_description',
      'missing_photo',
    ]);
    for (let n = 0; n < 4; n += 1) expect((await create(headers)).statusCode).toBe(201);
  });

  it('makes the route of an editor « Par Widoo »', async () => {
    const route = OwnRoute.parse((await create(await fixtures.signIn('editor'))).json());
    expect(route.isOfficial).toBe(true);
  });

  it('refuses an anonymous caller', async () => {
    expect((await create({})).statusCode).toBe(401);
  });
});

describe('GET /me/routes/:id', () => {
  it('reads my route as the editor shows it, and answers 404 to anyone else', async () => {
    const headers = await fixtures.signIn();
    const created = OwnRoute.parse((await create(headers, { title: 'À moi' })).json());
    const response = await read(headers, created.id);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(OwnRoute.parse(response.json())).toEqual(created);
    expect((await read(await fixtures.signIn('admin'), created.id)).statusCode).toBe(404);
  });
});
