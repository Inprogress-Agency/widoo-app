import { AdminSetting, AdminSettings, ApiError, type UserRole } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, settings, users } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// `settings` is shared by every test file: only `premium.min_steps` is changed here, and the row
// is put back as it was found.
const key = 'premium.min_steps';
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
let originalRow: typeof settings.$inferSelect | undefined;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  [originalRow] = await app.db.select().from(settings).where(eq(settings.key, key));
});
afterAll(async () => {
  await app.db.delete(settings).where(eq(settings.key, key));
  if (originalRow) {
    await app.db.insert(settings).values(originalRow);
  }
  const ids = await app.db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.firebaseUid, createdUids));
  await app.db.delete(adminActions).where(
    inArray(
      adminActions.actorId,
      ids.map((row) => row.id),
    ),
  );
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  const [user] = await app.db
    .insert(users)
    .values({ id: uuidv7(), firebaseUid: uid, role })
    .returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

const patch = (headers: Record<string, string>, settingKey: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/admin/settings/${settingKey}`, headers, payload });

describe('GET /v1/admin/settings', () => {
  it('is for admins only', async () => {
    for (const role of ['editor', 'moderator'] as const) {
      const member = await signIn(role);
      const response = await app.inject({ url: '/v1/admin/settings', headers: member.headers });
      expect(response.statusCode).toBe(403);
      expect(ApiError.parse(response.json()).code).toBe('forbidden');
    }
  });

  it('lists the settings the code reads, with the value in force', async () => {
    const admin = await signIn('admin');
    const response = await app.inject({ url: '/v1/admin/settings', headers: admin.headers });
    expect(response.statusCode).toBe(200);
    const { items } = AdminSettings.parse(response.json());
    expect(items.map((item) => item.key)).toEqual([
      'premium.min_steps',
      'max_pending_routes',
      'certification.min_verified_routes',
      'certification.min_rating',
      'certification.min_completed_routes',
      'search.cluster_area_km2',
      'recommendation.weights',
    ]);
    expect(items.find((item) => item.key === 'recommendation.weights')?.kind).toBe('weights');
  });
});

describe('PATCH /v1/admin/settings/:key', () => {
  it('changes a setting, tells the value in force and journals it with its reason', async () => {
    const admin = await signIn('admin');
    const before = AdminSetting.parse(
      (await app.inject({ url: '/v1/admin/settings', headers: admin.headers }))
        .json()
        .items.find((item: { key: string }) => item.key === key),
    );
    const response = await patch(admin.headers, key, { value: 7, reason: 'Parcours plus riches' });
    expect(response.statusCode).toBe(200);
    expect(AdminSetting.parse(response.json())).toMatchObject({ key, value: 7, isCustom: true });

    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.actorId, admin.id));
    expect(entry).toMatchObject({
      action: 'setting.update',
      targetType: 'setting',
      targetId: key,
      reason: 'Parcours plus riches',
      before: { value: before.value, isCustom: before.isCustom },
      after: { value: 7 },
    });
    const [row] = await app.db.select().from(settings).where(eq(settings.key, key));
    expect(row?.value).toBe(7);
  });

  it('is for admins only', async () => {
    const moderator = await signIn('moderator');
    const response = await patch(moderator.headers, key, { value: 6, reason: 'Essai' });
    expect(response.statusCode).toBe(403);
  });

  it('refuses a value out of bounds, a fraction for a count and weights that all are zero', async () => {
    const admin = await signIn('admin');
    for (const value of [0, 21, 4.5]) {
      expect((await patch(admin.headers, key, { value, reason: 'Essai' })).statusCode).toBe(400);
    }
    const zero = await patch(admin.headers, 'recommendation.weights', {
      value: { proximity: 0 },
      reason: 'Essai',
    });
    expect(zero.statusCode).toBe(400);
    const unknown = await patch(admin.headers, 'recommendation.weights', {
      value: { luck: 1 },
      reason: 'Essai',
    });
    expect(unknown.statusCode).toBe(400);
  });

  it('asks for a reason and a number, and knows its keys', async () => {
    const admin = await signIn('admin');
    expect((await patch(admin.headers, key, { value: 6 })).statusCode).toBe(422);
    expect((await patch(admin.headers, key, { value: '6', reason: 'Essai' })).statusCode).toBe(422);
    expect(
      (await patch(admin.headers, 'free.max_routes', { value: 2, reason: 'Essai' })).statusCode,
    ).toBe(404);
  });
});
