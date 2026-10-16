import { AdminActionFilters, AdminActions, ApiError, type UserRole } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: the lines of this file carry their own kind of target, and
// every query narrows to it.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const targetType = `journal-test-${uuidv7().slice(-12)}`;
const hour = 60 * 60 * 1000;

let app: Awaited<ReturnType<typeof buildApp>>;
let actorId: string;
let otherActorId: string;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  const create = async (firstName: string) => {
    const uid = `test-${uuidv7()}`;
    createdUids.push(uid);
    const [user] = await app.db
      .insert(users)
      .values({ id: uuidv7(), firebaseUid: uid, firstName, role: 'admin' })
      .returning();
    if (!user) throw new Error('User not created');
    return user.id;
  };
  actorId = await create('Ilan');
  otherActorId = await create('Paul');
  const line = (
    actor: string,
    action: string,
    targetId: string,
    hoursAgo: number,
    extra: { reason?: string; before?: unknown; after?: unknown } = {},
  ) => ({
    actorId: actor,
    action,
    targetType,
    targetId,
    createdAt: new Date(Date.now() - hoursAgo * hour),
    ...extra,
  });
  await app.db.insert(adminActions).values([
    line(actorId, 'route.publish', 'a', 1, { reason: 'Conforme' }),
    line(actorId, 'user.suspend', 'b', 48, {
      before: { suspended: false },
      after: { suspended: true },
    }),
    line(otherActorId, 'route.publish', 'c', 24 * 20),
  ]);
});
afterAll(async () => {
  await app.db.delete(adminActions).where(eq(adminActions.targetType, targetType));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  await app.db.insert(users).values({ id: uuidv7(), firebaseUid: uid, role });
  return { authorization: `Bearer ${token}` };
}

const list = async (query: string) => {
  const headers = await signIn('admin');
  const response = await app.inject({
    url: `/v1/admin/actions?targetType=${targetType}${query}`,
    headers,
  });
  expect(response.statusCode).toBe(200);
  return AdminActions.parse(response.json());
};

describe('GET /v1/admin/actions', () => {
  it('is for admins only', async () => {
    for (const role of ['editor', 'moderator'] as const) {
      const response = await app.inject({
        url: '/v1/admin/actions',
        headers: await signIn(role),
      });
      expect(response.statusCode).toBe(403);
      expect(ApiError.parse(response.json()).code).toBe('forbidden');
    }
  });

  it('lists the lines most recent first, with their author, reason and states', async () => {
    const page = await list('');
    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.targetId)).toEqual(['a', 'b', 'c']);
    expect(page.items[0]).toMatchObject({
      action: 'route.publish',
      reason: 'Conforme',
      actor: { id: actorId, name: 'Ilan' },
    });
    expect(page.items[1]).toMatchObject({
      before: { suspended: false },
      after: { suspended: true },
    });
  });

  it('filters by author, kind of action, object and period', async () => {
    expect((await list(`&actorId=${otherActorId}`)).items.map((item) => item.targetId)).toEqual([
      'c',
    ]);
    expect((await list('&action=user.suspend')).items.map((item) => item.targetId)).toEqual(['b']);
    expect((await list('&targetId=a')).items).toHaveLength(1);
    expect((await list('&period=24h')).items.map((item) => item.targetId)).toEqual(['a']);
    expect((await list('&period=7d')).items.map((item) => item.targetId)).toEqual(['a', 'b']);
    expect((await list('&period=30d')).total).toBe(3);
  });

  it('refuses an unknown period', async () => {
    const headers = await signIn('admin');
    const response = await app.inject({ url: '/v1/admin/actions?period=1y', headers });
    expect(response.statusCode).toBe(400);
  });
});

describe('the name of the target', () => {
  it('tells which account a line is about, and has none for a kind without a name', async () => {
    const [named] = await app.db
      .insert(adminActions)
      .values({ actorId, action: 'user.suspend', targetType: 'user', targetId: otherActorId })
      .returning({ id: adminActions.id });
    try {
      const headers = await signIn('admin');
      const response = await app.inject({
        url: `/v1/admin/actions?targetType=user&targetId=${otherActorId}`,
        headers,
      });
      expect(AdminActions.parse(response.json()).items[0]).toMatchObject({ targetLabel: 'Paul' });
      expect((await list('')).items.every((item) => item.targetLabel === null)).toBe(true);
    } finally {
      if (named) await app.db.delete(adminActions).where(eq(adminActions.id, named.id));
    }
  });
});

describe('GET /v1/admin/actions/filters', () => {
  it('offers the authors, actions and kinds of target of the journal', async () => {
    const headers = await signIn('admin');
    const response = await app.inject({ url: '/v1/admin/actions/filters', headers });
    const filters = AdminActionFilters.parse(response.json());
    expect(filters.actors.map((actor) => actor.name)).toEqual(
      expect.arrayContaining(['Ilan', 'Paul']),
    );
    expect(filters.actions).toEqual(expect.arrayContaining(['route.publish', 'user.suspend']));
    expect(filters.targetTypes).toContain(targetType);
  });
});
