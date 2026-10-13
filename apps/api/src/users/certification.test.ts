import { certificationSettingKeys, defaultCertificationThresholds } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, createSql } from '../db/client';
import { settings } from '../db/schema';
import { seed } from '../db/seed';
import { testConfig } from '../test-config';
import { createCertificationThresholds } from './certification';

describe('certification thresholds', () => {
  const sql = createSql(testConfig().databaseUrl);
  const db = createDb(sql);
  const key = certificationSettingKeys.minRating;
  const setRating = (value: unknown) =>
    db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });

  beforeAll(() => seed(db));
  afterAll(async () => {
    await setRating(defaultCertificationThresholds.minRating);
    await sql.end();
  });

  it('are the wiki values the seed writes in settings', async () => {
    const rows = await db.select().from(settings);
    const seeded = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    expect(seeded).toMatchObject({
      'certification.min_verified_routes': 3,
      'certification.min_rating': 4.5,
      'certification.min_completed_routes': 3,
    });
  });

  it('follow a change of settings within a minute, without a deployment', async () => {
    let clock = 0;
    const thresholds = createCertificationThresholds(db, () => clock);
    expect(await thresholds()).toEqual(defaultCertificationThresholds);

    await setRating(4.2);
    clock = 59_999;
    expect((await thresholds()).minRating).toBe(4.5);
    clock = 60_000;
    expect(await thresholds()).toEqual({ ...defaultCertificationThresholds, minRating: 4.2 });
  });

  it('fall back to the default of a deleted row', async () => {
    await db.delete(settings).where(eq(settings.key, key));
    expect(await createCertificationThresholds(db)()).toEqual(defaultCertificationThresholds);
  });
});
