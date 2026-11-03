import { MyDataExport, PlannedRoute, RouteDetail, RouteSearchResult } from '@widoo/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media, steps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures, saturdayTen } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: a copy of the demo route of this file only, its photos fictitious.
const base = 'https://storage.googleapis.com/widoo-test-media';
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
const photoIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig({ MEDIA_PUBLIC_BASE_URL: base }), { tokenVerifier: verifier });
});
afterAll(async () => {
  if (photoIds.length > 0) await app.db.delete(media).where(inArray(media.id, photoIds));
  await fixtures.cleanUp();
  await app.close();
});

/** A photo stored by path in the bucket, as the upload writes it (#47). */
async function storedPhoto(ownerType: 'route' | 'step', ownerId: string) {
  const id = uuidv7();
  photoIds.push(id);
  await app.db
    .insert(media)
    .values({ id, ownerType, ownerId, storagePath: `photos/${id}`, width: 1600, height: 1067 });
  return id;
}

/** A published route of the signed-in account, with a stored cover and a stored step photo. */
async function routeWithStoredPhotos(headers: Record<string, string>) {
  const me = await app.inject({ url: '/v1/me', headers });
  const title = `Photos ${uuidv7().slice(-12)}`;
  const routeId = await fixtures.copyDemoRoute({ title, authorId: me.json<{ id: string }>().id });
  const [first] = await app.db
    .select({ id: steps.id })
    .from(steps)
    .where(eq(steps.routeId, routeId))
    .orderBy(asc(steps.position))
    .limit(1);
  if (!first) throw new Error('The copied route has no step');
  const coverId = await storedPhoto('route', routeId);
  const stepPhotoId = await storedPhoto('step', first.id);
  return { routeId, title, stepId: first.id, coverId, stepPhotoId };
}

describe('a photo stored by path (#530)', () => {
  it('is served under the public URL of the bucket: search, sheet, snapshot and export', async () => {
    const headers = await fixtures.signIn();
    const { routeId, title, stepId, coverId, stepPhotoId } = await routeWithStoredPhotos(headers);
    const cover = (width: number) => `${base}/photos/${coverId}/${width}.jpg`;
    const stepPhoto = `${base}/photos/${stepPhotoId}/1600.jpg`;

    const search = await app.inject({
      url: `/v1/routes/search?bbox=2.30,48.83,2.40,48.89&sort=duration&q=${encodeURIComponent(title)}`,
    });
    expect(search.statusCode).toBe(200);
    const { items } = RouteSearchResult.parse(search.json());
    expect(items.map((card) => [card.id, card.coverUrl])).toEqual([[routeId, cover(800)]]);

    const sheet = RouteDetail.parse((await app.inject({ url: `/v1/routes/${routeId}` })).json());
    expect(sheet.coverUrl).toBe(cover(800));
    expect(sheet.photos.map((photo) => photo.url)).toEqual([cover(1600)]);
    const sheetStep = sheet.steps.find((step) => step.id === stepId);
    expect(sheetStep && !sheetStep.isLocked && sheetStep.photos).toEqual([
      { url: stepPhoto, credit: null },
    ]);

    const planned = await app.inject({
      method: 'POST',
      url: '/v1/me/planned',
      headers,
      payload: { routeId, startsAt: saturdayTen },
    });
    expect(planned.statusCode).toBe(201);
    const snapshot = PlannedRoute.parse(planned.json()).route;
    const frozen = snapshot.steps.find((step) => step.id === stepId)?.photos ?? [];
    expect(frozen).toEqual([{ url: stepPhoto, credit: null }]);
    // Frozen for the Go offline: a public URL, neither signed nor dated, which never expires.
    expect(frozen.map((photo) => new URL(photo.url).search)).toEqual(['']);

    const exported = await app.inject({ url: '/v1/me/export', headers });
    expect(exported.statusCode).toBe(200);
    const { createdRoutes } = MyDataExport.parse(exported.json());
    expect(createdRoutes).toMatchObject([{ id: routeId, photoUrls: [cover(1600)] }]);
    expect(createdRoutes[0]?.steps[0]?.photoUrls).toEqual([stepPhoto]);
    expect(exported.body).not.toContain(`"photos/${coverId}"`);
  });

  it('is left out where no bucket serves it, as before', async () => {
    const withoutBucket = await buildApp(testConfig(), { tokenVerifier: verifier });
    try {
      const headers = await fixtures.signIn();
      const { routeId } = await routeWithStoredPhotos(headers);
      const sheet = RouteDetail.parse(
        (await withoutBucket.inject({ url: `/v1/routes/${routeId}` })).json(),
      );
      expect(sheet).toMatchObject({ coverUrl: null, photos: [] });
      const exported = await withoutBucket.inject({ url: '/v1/me/export', headers });
      expect(MyDataExport.parse(exported.json()).createdRoutes).toMatchObject([
        { id: routeId, photoUrls: [] },
      ]);
    } finally {
      await withoutBucket.close();
    }
  });
});
