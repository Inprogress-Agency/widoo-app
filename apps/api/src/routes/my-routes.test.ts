import { MyRouteList, OwnRoute } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes } from '../db/schema';
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

describe('GET /me/routes', () => {
  it('lists my routes of every status, the newest first, page by page', async () => {
    const headers = await fixtures.signIn();
    const ids: string[] = [];
    for (const title of ['Un', 'Deux', 'Trois']) {
      ids.push(OwnRoute.parse((await create(headers, { title })).json()).id);
    }
    await app.db
      .update(routes)
      .set({ status: 'private' })
      .where(eq(routes.id, ids[0] ?? ''));
    await create(await fixtures.signIn(), { title: 'Pas à moi' });

    const first = MyRouteList.parse(
      (await app.inject({ url: '/v1/me/routes?limit=2', headers })).json(),
    );
    expect(first.items.map((item) => item.title)).toEqual(['Trois', 'Deux']);
    const second = MyRouteList.parse(
      (
        await app.inject({ url: `/v1/me/routes?limit=2&cursor=${first.nextCursor}`, headers })
      ).json(),
    );
    expect(second).toMatchObject({
      items: [{ title: 'Un', status: 'private', stepCount: 0, revision: null }],
      nextCursor: null,
    });
  });
});
