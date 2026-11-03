import { inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { testConfig } from '../test-config';
import { createDb, createSql } from './client';
import { users } from './schema';
import { uuidv7 } from './uuid';

type Plan = Pick<
  typeof users.$inferInsert,
  'plan' | 'planSource' | 'planProduct' | 'planWillRenew'
>;

// Migration 0022 (#424, D-116) on the migrated test database, with fictitious accounts only.
describe('the product and the renewal of a plan', () => {
  const sql = createSql(testConfig().databaseUrl);
  const db = createDb(sql);
  const ids: string[] = [];

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, ids));
    await sql.end();
  });

  const insert = (plan: Plan = {}) => {
    const id = uuidv7();
    ids.push(id);
    return db
      .insert(users)
      .values({ id, firebaseUid: `test-plan-${id}`, ...plan })
      .returning();
  };

  /** Name of the constraint the account violates, or null when it is stored. */
  const violated = async (plan: Plan) => {
    try {
      await insert(plan);
      return null;
    } catch (error) {
      const cause = (error as { cause?: { constraint_name?: string } }).cause;
      return cause?.constraint_name ?? (error as { constraint_name?: string }).constraint_name;
    }
  };

  it('gives a new account no product and no renewal', async () => {
    const [user] = await insert();
    expect(user).toMatchObject({
      plan: 'free',
      planSource: 'store',
      planProduct: null,
      planWillRenew: false,
    });
  });

  it.each([
    ['a subscription that renews', { plan: 'premium', planProduct: 'annual', planWillRenew: true }],
    ['a subscription cancelled in the store', { plan: 'premium', planProduct: 'monthly' }],
    ['a 7-day pass', { plan: 'premium', planProduct: 'pass_7d' }],
    ['a gift of the team', { plan: 'premium', planSource: 'gift' }],
  ] as const)('stores %s', async (_, plan) => {
    expect(await violated(plan)).toBeNull();
  });

  it.each([
    ['a product while free', { plan: 'free', planProduct: 'monthly' }, 'users_plan_product_check'],
    [
      'a product for a gift',
      { plan: 'premium', planSource: 'gift', planProduct: 'annual' },
      'users_plan_product_check',
    ],
    [
      'a pass that renews',
      { plan: 'premium', planProduct: 'pass_7d', planWillRenew: true },
      'users_plan_will_renew_check',
    ],
    [
      'a renewal without a product',
      { plan: 'premium', planWillRenew: true },
      'users_plan_will_renew_check',
    ],
  ] as const)('refuses %s', async (_, plan, constraint) => {
    expect(await violated(plan)).toBe(constraint);
  });
});
