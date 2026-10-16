import { AdminUserDetail, AdminUsers, ApiError, type UserRole } from '@widoo/shared';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, routes, users } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users and routes, and only those are listed or deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const marker = `userstest${uuidv7().slice(-12)}`;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
});
afterAll(async () => {
  const ids = await app.db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.firebaseUid, createdUids));
  await app.db.delete(adminActions).where(
    inArray(
      adminActions.targetId,
      ids.map((row) => row.id),
    ),
  );
  await app.db.delete(routes).where(inArray(routes.id, createdRouteIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

/** An account of this file, signed in with a second factor; `firstName` carries the marker. */
async function signIn(role: UserRole, name = 'Membre') {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  const [user] = await app.db
    .insert(users)
    .values({ firebaseUid: uid, role, firstName: name, email: `${name}-${uid}@${marker}.test` })
    .returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

type Headers = Record<string, string>;
const get = (headers: Headers, url: string) => app.inject({ url: `/v1/admin${url}`, headers });

describe('GET /v1/admin/users', () => {
  it('is for moderators and admins, not for an editor', async () => {
    const editor = await signIn('editor');
    const response = await get(editor.headers, '/users');
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('finds an account by part of its e-mail or first name, and by identifier', async () => {
    const moderator = await signIn('moderator');
    const target = await signIn('user', 'Zéphyrine');
    const byMail = AdminUsers.parse((await get(moderator.headers, `/users?q=${marker}`)).json());
    expect(byMail.items.map((item) => item.id)).toContain(target.id);
    const byName = AdminUsers.parse(
      (await get(moderator.headers, `/users?q=${encodeURIComponent('zéphyr')}`)).json(),
    );
    expect(byName.items.map((item) => item.id)).toContain(target.id);
    const byId = AdminUsers.parse((await get(moderator.headers, `/users?q=${target.id}`)).json());
    expect(byId.items.map((item) => item.id)).toEqual([target.id]);
    expect(byId.items[0]).toMatchObject({ role: 'user', plan: { plan: 'free', source: 'store' } });
  });

  it('does not take % or _ as jokers', async () => {
    const moderator = await signIn('moderator');
    const response = AdminUsers.parse((await get(moderator.headers, '/users?q=%25')).json());
    expect(response.items.every((item) => `${item.email}${item.firstName}`.includes('%'))).toBe(
      true,
    );
  });

  it('reads the card of an account, and answers 404 for an unknown one', async () => {
    const moderator = await signIn('moderator');
    const target = await signIn('user');
    const card = AdminUserDetail.parse(
      (await get(moderator.headers, `/users/${target.id}`)).json(),
    );
    expect(card).toMatchObject({
      id: target.id,
      suspendedAt: null,
      certification: { isCertified: false, override: 'none' },
      ratingsGiven: [],
    });
    const missing = await get(moderator.headers, `/users/${uuidv7()}`);
    expect(missing.statusCode).toBe(404);
  });
});
