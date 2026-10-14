import { RouteSearchResult, type RouteStatus } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import {
  media,
  notifications,
  plannedRoutes,
  routeReports,
  routeRevisions,
  routes,
  steps,
  users,
} from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: copies of the demo route on a zone of their own, far from the
// searches of other files, accounts of their own, photos with fictitious paths; all deleted
// afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = plannedFixtures(() => app, verifier);
const mediaOwnerIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  if (mediaOwnerIds.length > 0) {
    await app.db.delete(media).where(inArray(media.ownerId, mediaOwnerIds));
  }
  await fixtures.cleanUp();
  await app.close();
});

const meOf = async (headers: Record<string, string>) =>
  (await app.inject({ url: '/v1/me', headers })).json<{ id: string }>().id;

async function addPhoto(ownerType: 'route' | 'step', ownerId: string) {
  mediaOwnerIds.push(ownerId);
  const [photo] = await app.db
    .insert(media)
    .values({ ownerType, ownerId, storagePath: `test/${ownerId}.jpg`, width: 1200, height: 800 })
    .returning({ id: media.id });
  return photo?.id ?? '';
}

/** A copy of the demo route by `authorId` in `status`, a photo on the route and on its first step. */
async function routeOf(authorId: string, status: RouteStatus) {
  const id = await fixtures.copyDemoRoute({
    authorId,
    status,
    isOfficial: false,
    title: `Membre Widoo ${status}`,
    startLocation: { lat: -21.5, lng: 17.5 },
    bounds: { west: 17.5, south: -21.5, east: 17.501, north: -21.499 },
    publishedAt: status === 'published' || status === 'needs_fix' ? new Date() : null,
  });
  const [first] = await app.db.select().from(steps).where(eq(steps.routeId, id)).limit(1);
  const photoIds = [await addPhoto('route', id), await addPhoto('step', first?.id ?? '')];
  return { id, photoIds };
}

const exists = async (table: typeof routes | typeof media, ids: string[]) =>
  (await app.db.select({ id: table.id }).from(table).where(inArray(table.id, ids))).length;

// Nine copies of the demo route with their photos: over the default 5 s when the suite runs at once.
const manyRoutes = { timeout: 20_000 };

describe('DELETE /v1/me and the routes of the account (D-025)', () => {
  it(
    'deletes the routes not online with their steps and photos, keeps the others unsigned',
    manyRoutes,
    async () => {
      const author = await fixtures.signIn();
      const authorId = await meOf(author);
      const reader = await fixtures.signIn();
      const readerId = await meOf(reader);

      const offline = await Promise.all(
        (
          ['draft', 'private', 'pending', 'changes_requested', 'rejected', 'unpublished'] as const
        ).map((status) => routeOf(authorId, status)),
      );
      const online = await Promise.all(
        (['published', 'needs_fix'] as const).map((status) => routeOf(authorId, status)),
      );
      const published = online[0]?.id ?? '';
      const otherDraft = await routeOf(readerId, 'draft');

      // An unfinished revision of the published route, with a step it alone holds and its photo.
      const [kept] = await app.db.select().from(steps).where(eq(steps.routeId, published));
      const addedStepId = uuidv7();
      const addedPhoto = await addPhoto('step', addedStepId);
      await app.db.insert(routeRevisions).values({
        routeId: published,
        authorId,
        snapshot: { steps: [{ id: kept?.id }, { id: addedStepId }] },
      });
      // The reader planned the private route, reported the published one and was notified.
      const planned = await app.inject({
        method: 'POST',
        url: '/v1/me/planned',
        headers: reader,
        payload: { routeId: published, startsAt: '2030-06-01T10:00:00+02:00' },
      });
      expect(planned.statusCode, planned.body).toBe(201);
      await app.db
        .update(plannedRoutes)
        .set({ routeId: offline[1]?.id })
        .where(eq(plannedRoutes.userId, readerId));
      const otherReport = { routeId: published, reason: 'hidden_ad' as const };
      await app.db.insert(routeReports).values({ ...otherReport, userId: readerId });
      await app.db
        .insert(routeReports)
        .values({ routeId: otherDraft.id, userId: authorId, reason: 'hidden_ad' });
      await app.db.insert(notifications).values({ userId: authorId, kind: 'report_resolved' });

      const response = await app.inject({ method: 'DELETE', url: '/v1/me', headers: author });
      expect(response.statusCode).toBe(204);

      const offlineIds = offline.map((route) => route.id);
      expect(await exists(routes, offlineIds)).toBe(0);
      expect(await app.db.select().from(steps).where(inArray(steps.routeId, offlineIds))).toEqual(
        [],
      );
      expect(await exists(media, [...offline.flatMap((route) => route.photoIds), addedPhoto])).toBe(
        0,
      );
      expect(
        await app.db.select().from(routeRevisions).where(eq(routeRevisions.authorId, authorId)),
      ).toEqual([]);
      for (const table of [routeReports, notifications]) {
        expect(await app.db.select().from(table).where(eq(table.userId, authorId))).toEqual([]);
      }

      // Online routes stay with their steps and photos, still linked until the purge.
      const onlineIds = online.map((route) => route.id);
      expect(await exists(routes, onlineIds)).toBe(2);
      expect(
        await exists(
          media,
          online.flatMap((route) => route.photoIds),
        ),
      ).toBe(4);
      expect(await app.db.select().from(steps).where(eq(steps.routeId, published))).not.toEqual([]);
      // Nothing of another account is touched; its planning keeps the snapshot of the route.
      expect(await exists(routes, [otherDraft.id])).toBe(1);
      expect(await exists(media, otherDraft.photoIds)).toBe(2);
      expect(
        await app.db.select().from(routeReports).where(eq(routeReports.userId, readerId)),
      ).toHaveLength(1);
      const [snapshot] = await app.db
        .select()
        .from(plannedRoutes)
        .where(eq(plannedRoutes.userId, readerId));
      expect(snapshot).toMatchObject({ routeId: null, routeRevisionSnapshot: expect.any(Object) });

      // « Membre Widoo »: a card without author, never « Par Widoo » (the search lists published).
      const search = await app.inject({
        url: '/v1/routes/search?bbox=17.49,-21.51,17.51,-21.49',
      });
      expect(search.statusCode, search.body).toBe(200);
      const cards = RouteSearchResult.parse(search.json()).items;
      expect(cards.map((card) => card.id)).toEqual([published]);
      for (const card of cards) {
        expect(card).toMatchObject({ author: null, isOfficial: false });
      }
    },
  );

  it('erases the store identifier of the account', async () => {
    const headers = await fixtures.signIn();
    const userId = await meOf(headers);
    await app.db
      .update(users)
      .set({ revenuecatAppUserId: `fictitious-${userId}` })
      .where(eq(users.id, userId));
    expect((await app.inject({ method: 'DELETE', url: '/v1/me', headers })).statusCode).toBe(204);
    const [deleted] = await app.db.select().from(users).where(eq(users.id, userId));
    expect(deleted).toMatchObject({ deletedAt: expect.any(Date), revenuecatAppUserId: null });
  });
});
