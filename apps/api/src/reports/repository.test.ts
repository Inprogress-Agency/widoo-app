import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routeReports, steps, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { createRouteReport, runningRouteReport, type NewRouteReport } from './repository';

// The rule of the 7 days (D-056, D-057) on the shared test database: copies of a demo route and
// fictitious accounts, deleted afterwards.
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

const now = new Date('2026-10-14T12:00:00Z');
const daysBefore = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

/** A fictitious reader and a copy of the demo route. */
async function readerAndRoute() {
  const [user] = await app.db
    .insert(users)
    .values({ firebaseUid: `fictitious-${uuidv7()}` })
    .returning({ id: users.id });
  if (!user) throw new Error('Account not created');
  userIds.push(user.id);
  return { userId: user.id, routeId: await fixtures.copyDemoRoute() };
}

const create = (report: NewRouteReport, at: Date = now) =>
  app.db.transaction((tx) => createRouteReport(tx, report, at));

const refusal = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: { statusCode?: number; details?: unknown }) => ({
      statusCode: error.statusCode,
      details: error.details,
    }),
  );

describe('createRouteReport', () => {
  it('refuses a second report on the same route within 7 days, with the date of the first', async () => {
    const { userId, routeId } = await readerAndRoute();
    const first = await create({ userId, routeId, reason: 'inappropriate' }, daysBefore(6.9));
    expect(await refusal(create({ userId, routeId, reason: 'false_info' }))).toEqual({
      statusCode: 409,
      details: { reportedAt: first.createdAt.toISOString() },
    });
    expect(
      await app.db.select().from(routeReports).where(eq(routeReports.routeId, routeId)),
    ).toHaveLength(1);
  });

  it('takes a new report once the first is 7 days old', async () => {
    const { userId, routeId } = await readerAndRoute();
    await create({ userId, routeId, reason: 'inappropriate' }, daysBefore(7));
    await create({ userId, routeId, reason: 'inappropriate' });
    expect(await runningRouteReport(app.db, routeId, userId, now)).toMatchObject({
      status: 'open',
      createdAt: now,
    });
  });

  it('takes a new report once the team decided the first, even within 7 days', async () => {
    const { userId, routeId } = await readerAndRoute();
    const first = await create({ userId, routeId, reason: 'hidden_ad' }, daysBefore(1));
    await app.db
      .update(routeReports)
      .set({ status: 'rejected', reviewedAt: now })
      .where(eq(routeReports.id, first.id));
    expect(await runningRouteReport(app.db, routeId, userId, now)).toBeNull();
    await create({ userId, routeId, reason: 'hidden_ad' });
  });

  it('counts per route and per user', async () => {
    const { userId, routeId } = await readerAndRoute();
    const other = await readerAndRoute();
    await create({ userId, routeId, reason: 'dangerous_place' });
    await create({ userId: other.userId, routeId, reason: 'dangerous_place' });
    await create({ userId, routeId: other.routeId, reason: 'dangerous_place' });
  });

  it('makes a report sent while another is being written wait for it, then refuses it', async () => {
    const { userId, routeId } = await readerAndRoute();
    const report: NewRouteReport = { userId, routeId, reason: 'copied_content' };
    let written!: () => void;
    let release!: () => void;
    const isWritten = new Promise<void>((resolve) => (written = resolve));
    const held = new Promise<void>((resolve) => (release = resolve));
    const first = app.db.transaction(async (tx) => {
      await createRouteReport(tx, report, now);
      written();
      await held;
    });
    await isWritten;
    // Without the lock, the second would read nothing yet and be written within this delay.
    const second = refusal(create(report));
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    await first;
    expect((await second)?.statusCode).toBe(409);
  });

  it('takes the step of place_changed from the route only', async () => {
    const { userId, routeId } = await readerAndRoute();
    const other = await readerAndRoute();
    const [foreign] = await app.db
      .select({ id: steps.id })
      .from(steps)
      .where(eq(steps.routeId, other.routeId))
      .limit(1);
    const refused = await refusal(
      create({ userId, routeId, reason: 'place_changed', stepId: foreign?.id ?? null }),
    );
    expect(refused?.statusCode).toBe(422);
    const [own] = await app.db
      .select({ id: steps.id })
      .from(steps)
      .where(eq(steps.routeId, routeId))
      .limit(1);
    await create({ userId, routeId, reason: 'place_changed', stepId: own?.id ?? null });
  });
});
