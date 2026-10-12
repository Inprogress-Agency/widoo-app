import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, createSql, type Db, type Sql } from '../db/client';
import { adminActions, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testDatabaseUrl } from '../test-database';
import { recordAdminAction } from './actions';

// Shared database, parallel files: one actor and its own target identifiers, deleted at the end.
let sql: Sql;
let db: Db;
let actorId: string;
const firebaseUid = `test-admin-actions-${uuidv7()}`;
const targetIds: string[] = [];

const newTarget = () => {
  const id = uuidv7();
  targetIds.push(id);
  return id;
};
const actionsOn = (targetId: string) =>
  db.select().from(adminActions).where(eq(adminActions.targetId, targetId));

beforeAll(async () => {
  sql = createSql(testDatabaseUrl());
  db = createDb(sql);
  const [actor] = await db.insert(users).values({ firebaseUid, role: 'admin' }).returning();
  if (!actor) throw new Error('Actor not created');
  actorId = actor.id;
});
afterAll(async () => {
  await db.delete(adminActions).where(inArray(adminActions.targetId, targetIds));
  await db.delete(users).where(eq(users.firebaseUid, firebaseUid));
  await sql.end({ timeout: 5 });
});

describe('recordAdminAction', () => {
  it('keeps who, what, on what, before, after and why', async () => {
    const targetId = newTarget();
    await recordAdminAction(db, {
      actorId,
      action: 'place.close',
      targetType: 'place',
      targetId,
      before: { status: 'verified' },
      after: { status: 'closed' },
      reason: 'Fermé définitivement',
    });

    const [row] = await actionsOn(targetId);
    expect(row).toMatchObject({
      actorId,
      action: 'place.close',
      targetType: 'place',
      targetId,
      before: { status: 'verified' },
      after: { status: 'closed' },
      reason: 'Fermé définitivement',
    });
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it('is saved with the change it describes, or not at all', async () => {
    const targetId = newTarget();
    const failingChange = db.transaction(async (tx) => {
      await recordAdminAction(tx, {
        actorId,
        action: 'route.publish',
        targetType: 'route',
        targetId,
      });
      throw new Error('the change failed');
    });

    await expect(failingChange).rejects.toThrow('the change failed');
    expect(await actionsOn(targetId)).toEqual([]);
  });

  it('outlives the account of its actor', async () => {
    const targetId = newTarget();
    const uid = `test-admin-actions-${uuidv7()}`;
    const [gone] = await db.insert(users).values({ firebaseUid: uid, role: 'admin' }).returning();
    if (!gone) throw new Error('Actor not created');
    await recordAdminAction(db, {
      actorId: gone.id,
      action: 'user.suspend',
      targetType: 'user',
      targetId,
    });
    await db.delete(users).where(eq(users.id, gone.id));

    const [row] = await actionsOn(targetId);
    expect(row).toMatchObject({ action: 'user.suspend', actorId: null });
  });
});
