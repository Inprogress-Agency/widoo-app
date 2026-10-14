import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testConfig } from '../test-config';
import { createDb, createSql } from './client';
import { plannedRoutes, plannedSteps, users } from './schema';
import { uuidv7 } from './uuid';

// The shape of D-029 (#129) as migrated: one account of this file, deleted afterwards.
const sql = createSql(testConfig().databaseUrl);
const db = createDb(sql);
const userId = uuidv7();
const timeline = {
  startsAt: '2026-10-24T08:00:00.000Z',
  endsAt: '2026-10-24T09:00:00.000Z',
  steps: [],
};
const planned = (values: Partial<typeof plannedRoutes.$inferInsert> = {}) =>
  db
    .insert(plannedRoutes)
    .values({
      userId,
      routeRevisionSnapshot: {},
      startsAt: new Date('2026-10-24T08:00:00Z'),
      timeline,
      ...values,
    })
    .returning({ id: plannedRoutes.id });

beforeAll(async () => {
  await db.insert(users).values({ id: userId, firebaseUid: `test-planned-schema-${userId}` });
});
afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await sql.end();
});

const columnsOf = async (table: string) =>
  (
    await sql<{ name: string }[]>`
      select column_name as name from information_schema.columns
      where table_schema = 'public' and table_name = ${table}`
  ).map((row) => row.name);

describe('planned_routes and planned_steps', () => {
  it('have the columns of D-029 and no personal note', async () => {
    const routeColumns = await columnsOf('planned_routes');
    expect(routeColumns).toEqual(expect.arrayContaining(['status', 'closed_by', 'completed_at']));
    expect(routeColumns).not.toContain('personal_note');
    expect(await columnsOf('planned_steps')).toEqual(
      expect.arrayContaining(['arrived_at', 'done_at', 'skipped_at']),
    );
  });

  it('allow one Go in progress at a time per user', async () => {
    const [first] = await planned({ status: 'in_progress' });
    await expect(planned({ status: 'in_progress' })).rejects.toThrow();
    await db.delete(plannedRoutes).where(eq(plannedRoutes.id, first?.id ?? ''));
  });

  it('keep closed_by for a closed Go and refuse a step both done and skipped', async () => {
    await expect(planned({ status: 'planned', closedBy: 'user' })).rejects.toThrow();
    const [stopped] = await planned({ status: 'stopped', closedBy: 'user' });
    const at = new Date();
    await expect(
      db.insert(plannedSteps).values({
        plannedRouteId: stopped?.id ?? '',
        stepId: uuidv7(),
        position: 0,
        doneAt: at,
        skippedAt: at,
      }),
    ).rejects.toThrow();
  });
});
