import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';
import { placeSignals, places, plannedRoutes, users } from './schema';
import { seed } from './seed';
import { uuidv7 } from './uuid';

// Migration 0022 (#49), on fictitious accounts, places and outings deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
let cityId = '';
const userIds: string[] = [];
const placeIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig());
  ({ cityId } = await seed(app.db));
});
afterAll(async () => {
  if (userIds.length > 0) await app.db.delete(users).where(inArray(users.id, userIds));
  if (placeIds.length > 0) await app.db.delete(places).where(inArray(places.id, placeIds));
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

/** An account, an outing of its own and a fictitious place far from the searches. */
async function context() {
  const userId = await account();
  const [outing] = await app.db
    .insert(plannedRoutes)
    .values({ userId, routeRevisionSnapshot: {}, startsAt: new Date(), timeline: {} })
    .returning({ id: plannedRoutes.id });
  const placeId = uuidv7();
  placeIds.push(placeId);
  await app.db.insert(places).values({
    id: placeId,
    cityId,
    name: 'Lieu fictif',
    category: 'cafe',
    location: { lat: -42, lng: -42 },
    address: 'Adresse fictive',
    verificationStatus: 'verified',
  });
  return { userId, placeId, contextPlannedRouteId: outing?.id ?? '', weight: 2 };
}

type Signal = typeof placeSignals.$inferInsert;
const signal = (values: Signal) => app.db.insert(placeSignals).values(values).returning();

describe('place_signals', () => {
  it('opens a confirmation, and a report with its reason', async () => {
    const base = await context();
    const [confirmed] = await signal({ ...base, kind: 'confirm' });
    expect(confirmed).toMatchObject({ status: 'open', reason: null, reviewedAt: null, weight: 2 });
    await signal({ ...base, kind: 'report', reason: 'closed_today' });
    await signal({ ...base, kind: 'report', reason: 'other', comment: 'Fictitious comment' });
  });

  it('refuses a report without reason, a confirmation with one, and a negative weight', async () => {
    const base = await context();
    await expect(signal({ ...base, kind: 'report' })).rejects.toThrow();
    await expect(signal({ ...base, kind: 'confirm', reason: 'works' })).rejects.toThrow();
    await expect(signal({ ...base, kind: 'confirm', weight: -1 })).rejects.toThrow();
  });

  it('requires a comment of 80 characters at most for other, and refuses one elsewhere', async () => {
    const base = await context();
    const other = { ...base, kind: 'report' as const, reason: 'other' as const };
    await expect(signal(other)).rejects.toThrow();
    await expect(signal({ ...other, comment: '  ' })).rejects.toThrow();
    await expect(signal({ ...other, comment: 'x'.repeat(81) })).rejects.toThrow();
    await expect(
      signal({ ...base, kind: 'report', reason: 'crowded', comment: 'Fictitious' }),
    ).rejects.toThrow();
    await expect(signal({ ...base, kind: 'confirm', comment: 'Fictitious' })).rejects.toThrow();
    await signal({ ...other, comment: 'x'.repeat(80) });
  });

  it('dates the decision of the team, and only it', async () => {
    const base = await context();
    const report = { ...base, kind: 'report' as const, reason: 'wrong_hours' as const };
    await expect(signal({ ...report, status: 'rejected' })).rejects.toThrow();
    await expect(signal({ ...report, reviewedAt: new Date() })).rejects.toThrow();
  });

  it('goes with the account, the place and the outing, and outlives the reviewer', async () => {
    const base = await context();
    const reviewer = await account();
    const [decided] = await signal({
      ...base,
      kind: 'report',
      reason: 'wrong_address',
      status: 'rejected',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    });
    await app.db.delete(users).where(eq(users.id, reviewer));
    const ofDecided = eq(placeSignals.id, decided?.id ?? '');
    expect(await app.db.select().from(placeSignals).where(ofDecided)).toMatchObject([
      { reviewedBy: null, status: 'rejected' },
    ]);
    await app.db.delete(plannedRoutes).where(eq(plannedRoutes.id, base.contextPlannedRouteId));
    expect(await app.db.select().from(placeSignals).where(ofDecided)).toEqual([]);

    const other = await context();
    await signal({ ...other, kind: 'confirm' });
    await app.db.delete(places).where(eq(places.id, other.placeId));
    expect(
      await app.db.select().from(placeSignals).where(eq(placeSignals.placeId, other.placeId)),
    ).toEqual([]);
    const last = await context();
    await signal({ ...last, kind: 'confirm' });
    await app.db.delete(users).where(eq(users.id, last.userId));
    expect(
      await app.db.select().from(placeSignals).where(eq(placeSignals.userId, last.userId)),
    ).toEqual([]);
  });
});
