import { randomUUID } from 'node:crypto';
import { MyDataExport } from '@widoo/shared';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import {
  devices,
  media,
  notifications,
  plannedRoutes,
  plannedSteps,
  routeRatings,
  routeReports,
  routeUnlocks,
  supportMessages,
  userAnecdotes,
  users,
} from '../db/schema';
import { editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';
import { exportUserData } from './export';

// Shared database, parallel files: accounts of this file only, deleted with what they own.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = editorFixtures(() => app, verifier);
const photoIds: string[] = [];
const plainUids: string[] = [];

async function accountOf(headers: Record<string, string>): Promise<string> {
  return (await app.inject({ url: '/v1/me', headers })).json().id;
}

/** An account with nothing in it, without the seed the editor fixtures run. */
function plainAccount() {
  const { token, uid } = verifier.issue();
  plainUids.push(uid);
  return { authorization: `Bearer ${token}` };
}

/** Fictitious data in every table of the account, `marker` in its free texts. */
async function fillAccount(headers: Record<string, string>, marker: string) {
  const userId = await accountOf(headers);
  const db = app.db;
  await db
    .update(users)
    .set({ bio: `Bio ${marker}`, locale: 'en' })
    .where(eq(users.id, userId));
  await db
    .insert(userAnecdotes)
    .values({ userId, questionKey: 'hidden_gem', answer: `Un bon plan ${marker}`, position: 1 });
  const route = await fixtures.publishableDraft(headers);
  const [photo] = await db
    .insert(media)
    .values({
      ownerType: 'route',
      ownerId: route.id,
      storagePath: `https://images.example.com/${marker}.jpg`,
      width: 1200,
      height: 800,
    })
    .returning({ id: media.id });
  if (photo) photoIds.push(photo.id);
  const [planned] = await db
    .insert(plannedRoutes)
    .values({
      userId,
      routeId: route.id,
      routeRevisionSnapshot: { title: 'Les musées du Marais' },
      startsAt: new Date('2026-10-17T08:00:00Z'),
      timeline: {},
    })
    .returning({ id: plannedRoutes.id });
  const stepId = route.steps[0]?.id ?? randomUUID();
  await db.insert(plannedSteps).values({ plannedRouteId: planned?.id ?? '', stepId, position: 1 });
  await db
    .insert(routeUnlocks)
    .values({ userId, routeId: route.id, storeTransactionId: `fictitious-${marker}` });
  await db.insert(routeRatings).values({
    userId,
    routeId: route.id,
    plannedRouteId: planned?.id ?? null,
    rating: 4,
    comment: `Avis ${marker}`,
  });
  await db
    .insert(routeReports)
    .values({ userId, routeId: route.id, reason: 'other', comment: `Signalement ${marker}` });
  await db.insert(supportMessages).values({
    userId,
    replyEmail: 'camille.fictive@example.com',
    topic: 'data',
    message: `Message ${marker}`,
    appVersion: '1.2.0',
    device: 'iPhone 15, iOS 18.2',
    locale: 'fr',
  });
  await db
    .insert(devices)
    .values({ userId, pushToken: `ExponentPushToken[fictitious-${marker}]`, locale: 'en' });
  await db.insert(notifications).values({ userId, kind: 'go_closed' });
  return { userId, route };
}

// One account filled once for the file: building it runs the seed and the editor.
const marker = randomUUID();
let filled: Awaited<ReturnType<typeof fillAccount>>;

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  filled = await fillAccount(await fixtures.signIn(), marker);
}, 30_000);
afterAll(async () => {
  if (photoIds.length > 0) await app.db.delete(media).where(inArray(media.id, photoIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, plainUids));
  await fixtures.cleanUp();
  await app.close();
});

describe('exportUserData', () => {
  it('exports every personal data of the account', async () => {
    const { userId, route } = filled;

    const exported = MyDataExport.parse(await exportUserData(app.db, userId));
    expect(exported.account).toMatchObject({ id: userId, bio: `Bio ${marker}` });
    expect(exported.preferences).toMatchObject({ locale: 'en' });
    expect(exported.anecdotes).toMatchObject([{ answer: `Un bon plan ${marker}` }]);
    expect(exported.plannedRoutes).toMatchObject([
      { routeId: route.id, title: 'Les musées du Marais', steps: [{ position: 1 }] },
    ]);
    expect(exported.createdRoutes).toMatchObject([
      { id: route.id, photoUrls: [`https://images.example.com/${marker}.jpg`] },
    ]);
    expect(exported.createdRoutes[0]?.steps).toHaveLength(route.steps.length);
    expect(exported.unlockedRoutes).toMatchObject([{ routeId: route.id }]);
    expect(exported.routeRatings).toMatchObject([
      { routeId: route.id, rating: 4, comment: `Avis ${marker}`, status: 'visible' },
    ]);
    expect(exported.routeReports).toMatchObject([{ comment: `Signalement ${marker}` }]);
    expect(exported.supportMessages).toMatchObject([{ message: `Message ${marker}` }]);
    expect(exported.devices).toMatchObject([{ locale: 'en' }]);
    expect(exported.notifications).toMatchObject([{ kind: 'go_closed' }]);
    // The push token is a credential of the push service, never returned.
    expect(JSON.stringify(exported)).not.toContain('ExponentPushToken');
  });

  it('exports the data of the caller only', async () => {
    const userId = await accountOf(plainAccount());

    const exported = MyDataExport.parse(await exportUserData(app.db, userId));
    expect(JSON.stringify(exported)).not.toContain(marker);
    expect(exported.createdRoutes).toEqual([]);
    expect(exported.supportMessages).toEqual([]);
  });

  /**
   * Every column pointing to an account is in the export or set aside with its reason: a new
   * table of personal data fails here until the export reads it (wiki Securite-et-RGPD).
   */
  it('covers every table that points to an account', async () => {
    const rows = await app.db.execute<{ column: string }>(sql`
      select kcu.table_name || '.' || kcu.column_name as column
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = rc.unique_constraint_name
      where ccu.table_name = 'users' and kcu.table_schema = 'public'
      order by 1`);
    const exported = [
      'devices.user_id',
      'notifications.user_id',
      'planned_routes.user_id',
      'route_ratings.user_id',
      'route_reports.user_id',
      'route_unlocks.user_id',
      'routes.author_id',
      'support_messages.user_id',
      'user_anecdotes.user_id',
      'user_featured_routes.user_id',
    ];
    const setAside = [
      // Photos of the caller's routes and steps are exported with them.
      'media.uploaded_by',
      // Places belong to the shared catalog, not to the person who added them.
      'places.created_by',
      // Decisions of a member of the team, part of their work.
      'route_reports.reviewed_by',
      // Working copy of a created route, whose content is exported with the route.
      'route_revisions.author_id',
    ];
    expect(rows.map((row) => row.column)).toEqual([...exported, ...setAside].sort());
  });

  it('exports nothing for a deleted account', async () => {
    const headers = plainAccount();
    const userId = await accountOf(headers);
    await app.inject({ method: 'DELETE', url: '/v1/me', headers });
    expect(await exportUserData(app.db, userId)).toBeNull();
  });
});
