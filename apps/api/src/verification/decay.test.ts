import { defaultVerificationRules, type VerificationStatus } from '@widoo/shared';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { places } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';
import { decayVerifications } from './decay';

// Shared database, parallel files: fictitious places far from the searches, decayed by id only,
// so that the seed and the other files keep their statuses.
let app: Awaited<ReturnType<typeof buildApp>>;
const now = new Date('2026-11-03T03:00:00.000Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 3_600_000);
const placeIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig());
});
afterAll(async () => {
  if (placeIds.length > 0) await app.db.delete(places).where(inArray(places.id, placeIds));
  await app.close();
});

/** Fictitious places by key, with their status and last verification. */
async function placesOf(rows: Record<string, [VerificationStatus, Date | null]>) {
  const { cityId } = await seed(app.db);
  const ids = Object.fromEntries(Object.keys(rows).map((key) => [key, uuidv7()]));
  placeIds.push(...Object.values(ids));
  await app.db.insert(places).values(
    Object.entries(rows).map(([key, [verificationStatus, verifiedAt]]) => ({
      id: ids[key],
      cityId,
      name: `Lieu fictif ${key}`,
      category: 'park' as const,
      location: { lat: -46, lng: -46 },
      address: 'Adresse fictive',
      verificationStatus,
      verifiedAt,
    })),
  );
  return ids;
}

const statusesOf = async (ids: Record<string, string>) => {
  const rows = await app.db
    .select({ id: places.id, status: places.verificationStatus })
    .from(places)
    .where(inArray(places.id, Object.values(ids)));
  const byId = new Map(rows.map((row) => [row.id, row.status]));
  return Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, byId.get(id)]));
};

describe('decayVerifications', () => {
  it('turns stale the places verified more than 90 days ago, or without a date', async () => {
    const ids = await placesOf({
      old: ['verified', daysAgo(91)],
      recent: ['verified', daysAgo(89)],
      undated: ['verified', null],
      flagged: ['flagged', daysAgo(200)],
      unverified: ['unverified', null],
    });

    const result = await decayVerifications(app.db, {
      now,
      rules: defaultVerificationRules,
      placeIds: Object.values(ids),
    });

    expect(result).toEqual({ updated: 2 });
    expect(await statusesOf(ids)).toEqual({
      old: 'stale',
      recent: 'verified',
      undated: 'stale',
      flagged: 'flagged',
      unverified: 'unverified',
    });
  });

  it('follows the delay of the settings, and touches nothing without a place', async () => {
    const ids = await placesOf({ recent: ['verified', daysAgo(10)] });
    const rules = { ...defaultVerificationRules, staleAfterDays: 7 };
    expect(await decayVerifications(app.db, { now, rules, placeIds: [] })).toEqual({ updated: 0 });

    expect(await decayVerifications(app.db, { now, rules, placeIds: Object.values(ids) })).toEqual({
      updated: 1,
    });
    expect(await statusesOf(ids)).toEqual({ recent: 'stale' });
  });
});
