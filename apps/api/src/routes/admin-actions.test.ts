import { AdminActionFilters, AdminActions, ApiError, type UserRole } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import {
  adminActions,
  affiliatePrograms,
  b2bClients,
  routeRatings,
  routeReports,
  supportMessages,
  users,
} from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: the lines of this file carry their own kind of target, and
// every query narrows to it.
const verifier = new TestTokenVerifier();
const fixtures = plannedFixtures(() => app, verifier);
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
  await fixtures.cleanUp();
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

  it('names the route of a report or a rating, a program, a partner, the topic of a message', async () => {
    const suffix = uuidv7().slice(-12);
    const routeId = await fixtures.copyDemoRoute({ title: `Parcours fictif ${suffix}` });
    const raterUid = `test-${uuidv7()}`;
    createdUids.push(raterUid);
    const [rater] = await app.db
      .insert(users)
      .values({ firebaseUid: raterUid })
      .returning({ id: users.id });
    if (!rater) throw new Error('Rater not created');
    const [report] = await app.db
      .insert(routeReports)
      .values({ routeId, reason: 'low_rating' })
      .returning({ id: routeReports.id });
    const [rating] = await app.db
      .insert(routeRatings)
      .values({ routeId, userId: rater.id, rating: 2 })
      .returning({ id: routeRatings.id });
    const [program] = await app.db
      .insert(affiliatePrograms)
      .values({ name: `Programme fictif ${suffix}`, network: 'Awin', cookieDays: 30 })
      .returning({ id: affiliatePrograms.id });
    const [partner] = await app.db
      .insert(b2bClients)
      .values({ name: `Hôtel fictif ${suffix}`, slug: `hotel-fictif-${suffix}`, type: 'hotel' })
      .returning({ id: b2bClients.id });
    const [message] = await app.db
      .insert(supportMessages)
      .values({
        replyEmail: 'fictitious@example.com',
        topic: 'problem',
        message: 'Message fictif',
        appVersion: '1.0.0',
        device: 'Test',
        locale: 'fr',
      })
      .returning({ id: supportMessages.id });
    if (!report || !rating || !program || !partner || !message) throw new Error('Not created');
    const targets = [
      ['route_report', report.id, `Parcours fictif ${suffix}`],
      ['rating', rating.id, `Parcours fictif ${suffix}`],
      ['affiliate_program', program.id, `Programme fictif ${suffix}`],
      ['b2b_client', partner.id, `Hôtel fictif ${suffix}`],
      ['support_message', message.id, 'problem'],
    ] as const;
    const lines = await app.db
      .insert(adminActions)
      .values(
        targets.map(([type, id]) => ({ actorId, action: 'test', targetType: type, targetId: id })),
      )
      .returning({ id: adminActions.id });
    const headers = await signIn('admin');
    const labelOf = async (type: string, id: string) => {
      const response = await app.inject({
        url: `/v1/admin/actions?targetType=${type}&targetId=${id}`,
        headers,
      });
      return AdminActions.parse(response.json()).items[0]?.targetLabel;
    };
    try {
      for (const [type, id, name] of targets) {
        expect(await labelOf(type, id)).toBe(name);
      }
      // Once the object is gone, the line has no name left.
      await app.db.delete(affiliatePrograms).where(eq(affiliatePrograms.id, program.id));
      expect(await labelOf('affiliate_program', program.id)).toBeNull();
    } finally {
      const ids = lines.map((line) => line.id);
      await app.db.delete(adminActions).where(inArray(adminActions.id, ids));
      await app.db.delete(affiliatePrograms).where(eq(affiliatePrograms.id, program.id));
      await app.db.delete(b2bClients).where(eq(b2bClients.id, partner.id));
      await app.db.delete(supportMessages).where(eq(supportMessages.id, message.id));
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
