import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { notifications, routeReports, routes, steps, users } from './schema';
import { uuidv7 } from './uuid';

// Migration 0009 (#184), on copies of a demo route and fictitious accounts deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());
const userIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig());
});
afterAll(async () => {
  if (userIds.length > 0) await app.db.delete(users).where(inArray(users.id, userIds));
  await fixtures.cleanUp();
  await app.close();
});

async function account() {
  const [user] = await app.db
    .insert(users)
    .values({ firebaseUid: `fictitious-${uuidv7()}` })
    .returning({ id: users.id });
  if (!user) throw new Error('Account not created');
  userIds.push(user.id);
  return user.id;
}

async function routeWithStep() {
  const routeId = await fixtures.copyDemoRoute();
  const [step] = await app.db.select().from(steps).where(eq(steps.routeId, routeId)).limit(1);
  if (!step) throw new Error('Demo route without steps');
  return { routeId, stepId: step.id };
}

type Report = typeof routeReports.$inferInsert;
const report = (values: Report) => app.db.insert(routeReports).values(values).returning();

describe('route_reports', () => {
  it('opens a report of a reader, with the step for place_changed', async () => {
    const { routeId, stepId } = await routeWithStep();
    const userId = await account();
    const [changed] = await report({ routeId, userId, reason: 'place_changed', stepId });
    expect(changed).toMatchObject({ status: 'open', reviewedAt: null, comment: null });
    await report({ routeId, userId, reason: 'other', comment: 'Fictitious comment' });
    await report({ routeId, userId, reason: 'hidden_ad' });
  });

  it('refuses a step outside place_changed, and place_changed without its step', async () => {
    const { routeId, stepId } = await routeWithStep();
    const userId = await account();
    await expect(report({ routeId, userId, reason: 'place_changed' })).rejects.toThrow();
    await expect(report({ routeId, userId, reason: 'inappropriate', stepId })).rejects.toThrow();
  });

  it('requires a comment of 80 characters at most for other, and refuses one elsewhere', async () => {
    const { routeId } = await routeWithStep();
    const userId = await account();
    await expect(report({ routeId, userId, reason: 'other' })).rejects.toThrow();
    await expect(report({ routeId, userId, reason: 'other', comment: '  ' })).rejects.toThrow();
    await expect(
      report({ routeId, userId, reason: 'other', comment: 'x'.repeat(81) }),
    ).rejects.toThrow();
    await expect(
      report({ routeId, userId, reason: 'false_info', comment: 'Fictitious' }),
    ).rejects.toThrow();
    await report({ routeId, userId, reason: 'other', comment: 'x'.repeat(80) });
  });

  it('has a reporter for every reason but low_rating, one of which is open at a time', async () => {
    const { routeId } = await routeWithStep();
    const userId = await account();
    await expect(report({ routeId, reason: 'inappropriate' })).rejects.toThrow();
    await expect(report({ routeId, userId, reason: 'low_rating' })).rejects.toThrow();
    const [first] = await report({ routeId, reason: 'low_rating' });
    await expect(report({ routeId, reason: 'low_rating' })).rejects.toThrow();
    await app.db
      .update(routeReports)
      .set({ status: 'accepted', reviewedAt: new Date() })
      .where(eq(routeReports.id, first?.id ?? ''));
    await report({ routeId, reason: 'low_rating' });
  });

  it('dates the decision of the team, and only it', async () => {
    const { routeId } = await routeWithStep();
    const userId = await account();
    await expect(
      report({ routeId, userId, reason: 'hidden_ad', status: 'rejected' }),
    ).rejects.toThrow();
    await expect(
      report({ routeId, userId, reason: 'hidden_ad', reviewedAt: new Date() }),
    ).rejects.toThrow();
  });

  it('goes with the reporter account and the route, and outlives the reviewer', async () => {
    const { routeId } = await routeWithStep();
    const [reporter, reviewer] = [await account(), await account()];
    const [decided] = await report({
      routeId,
      userId: reporter,
      reason: 'copied_content',
      status: 'rejected',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    });
    const [kept] = await report({
      routeId,
      userId: await account(),
      reason: 'hidden_ad',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      status: 'accepted',
    });
    await app.db.delete(users).where(eq(users.id, reviewer));
    const [afterReviewer] = await app.db
      .select()
      .from(routeReports)
      .where(eq(routeReports.id, kept?.id ?? ''));
    expect(afterReviewer).toMatchObject({ reviewedBy: null, status: 'accepted' });
    await app.db.delete(users).where(eq(users.id, reporter));
    expect(
      await app.db
        .select()
        .from(routeReports)
        .where(eq(routeReports.id, decided?.id ?? '')),
    ).toEqual([]);
    await app.db.delete(routes).where(eq(routes.id, routeId));
    expect(
      await app.db.select().from(routeReports).where(eq(routeReports.routeId, routeId)),
    ).toEqual([]);
  });
});

describe('notifications', () => {
  it('stores report_resolved, and goes with the account', async () => {
    const userId = await account();
    const [sent] = await app.db
      .insert(notifications)
      .values({ userId, kind: 'report_resolved' })
      .returning();
    expect(sent).toMatchObject({ kind: 'report_resolved', payload: {}, readAt: null });
    await app.db.delete(users).where(eq(users.id, userId));
    expect(
      await app.db.select().from(notifications).where(eq(notifications.userId, userId)),
    ).toEqual([]);
  });
});
