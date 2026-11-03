import { ApiError, MyDataExport, StoredPhoto, photoUploadDailyLimit } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { editorFixtures } from '../editor/test-fixtures';
import { mediaFixtures, testPhotoBase } from '../media/test-fixtures';
import { hasGpsExif, jpegWithGps } from '../media/test-photos';
import { testConfig } from '../test-config';

// Shared database, parallel files: accounts, routes, places and photos of this file only.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = editorFixtures(() => app, verifier);
const photos = mediaFixtures(() => app);

beforeAll(async () => {
  app = await buildApp(testConfig({ MEDIA_PUBLIC_BASE_URL: testPhotoBase }), {
    tokenVerifier: verifier,
    photoStorage: photos.storage,
  });
});
afterAll(async () => {
  await photos.cleanUp();
  await fixtures.cleanUp();
  await app.close();
});

const accountOf = async (headers: Record<string, string>) =>
  (await app.inject({ url: '/v1/me', headers })).json<{ id: string }>().id;

/** A draft of the account with a photo on the route and on each step, and its first step. */
async function draftOf(headers: Record<string, string>) {
  const route = await fixtures.publishableDraft(headers);
  const [step] = route.steps;
  if (!step) throw new Error('The draft has no step');
  return { routeId: route.id, stepId: step.id };
}

const widthsOf = (mediaId: string) =>
  [400, 800, 1600].map((width) => photos.storage.photos.get(`photos/${mediaId}/${width}.jpg`));

describe('POST /media/:id/confirm', () => {
  it('serves a photo with a GPS position without any metadata, in three widths', async () => {
    const headers = await fixtures.signIn();
    const userId = await accountOf(headers);
    const { stepId } = await draftOf(headers);
    const original = await jpegWithGps(2400, 1600);
    expect(await hasGpsExif(original)).toBe(true);

    const { ticket, confirmed } = await photos.sendPhoto(
      headers,
      { ownerType: 'step', ownerId: stepId },
      original,
    );

    expect(confirmed.statusCode).toBe(201);
    expect(confirmed.headers['cache-control']).toBe('no-store');
    // Orientation 6: upright, 1600 × 2400 fit into 1600 px.
    expect(StoredPhoto.parse(confirmed.json())).toEqual({
      id: ticket.mediaId,
      ownerType: 'step',
      ownerId: stepId,
      // After the photo the draft already has.
      position: 1,
      width: 1067,
      height: 1600,
      url: `${testPhotoBase}/photos/${ticket.mediaId}/1600.jpg`,
      credit: null,
    });
    for (const served of widthsOf(ticket.mediaId)) {
      if (!served) throw new Error('A width is missing from the public bucket');
      expect((await sharp(served).metadata()).exif).toBeUndefined();
      expect(await hasGpsExif(served)).toBe(false);
    }
    // The original and its EXIF are gone from the upload bucket.
    expect(photos.storage.uploads.has(`uploads/${userId}/${ticket.mediaId}`)).toBe(false);
    const [row] = await app.db.select().from(media).where(eq(media.id, ticket.mediaId));
    expect(row).toMatchObject({
      storagePath: `photos/${ticket.mediaId}`,
      uploadedBy: userId,
      source: 'upload',
    });

    // The app confirms again after a lost answer: the same photo, nothing more.
    const again = await photos.confirm(headers, ticket.mediaId);
    expect(again.statusCode).toBe(200);
    expect(again.json()).toEqual(confirmed.json());
  });

  it('refuses a file that is not a photo, and deletes it', async () => {
    const headers = await fixtures.signIn();
    const userId = await accountOf(headers);
    const { stepId } = await draftOf(headers);
    const fake = Buffer.from('%PDF-1.7 a fictitious document, sent as a JPEG');

    const { ticket, confirmed } = await photos.sendPhoto(
      headers,
      { ownerType: 'step', ownerId: stepId },
      fake,
    );

    expect(confirmed.statusCode).toBe(422);
    expect(ApiError.parse(confirmed.json())).toMatchObject({
      code: 'validation_error',
      details: { issues: [{ code: 'invalid_photo' }] },
    });
    expect(photos.storage.uploads.has(`uploads/${userId}/${ticket.mediaId}`)).toBe(false);
    expect(widthsOf(ticket.mediaId)).toEqual([undefined, undefined, undefined]);
    expect(await app.db.select().from(media).where(eq(media.id, ticket.mediaId))).toEqual([]);
  });

  it('answers 404 to an upload never sent, and to anyone but its sender', async () => {
    const headers = await fixtures.signIn();
    const { stepId } = await draftOf(headers);
    expect((await photos.confirm(headers, uuidv7())).statusCode).toBe(404);
    const { ticket } = await photos.sendPhoto(headers, { ownerType: 'step', ownerId: stepId });
    expect((await photos.confirm(await fixtures.signIn(), ticket.mediaId)).statusCode).toBe(404);
  });

  it('checks the quota again, and leaves nothing public of a photo refused', async () => {
    const headers = await fixtures.signIn();
    const userId = await accountOf(headers);
    const placeId = await photos.createPlace(headers, `Café dernier ${uuidv7().slice(-8)}`);
    const sent = await app.db
      .insert(media)
      .values(
        Array.from({ length: photoUploadDailyLimit - 1 }, (_, position) => ({
          ownerType: 'place' as const,
          ownerId: placeId,
          storagePath: `photos/${uuidv7()}`,
          width: 1600,
          height: 1067,
          position,
          uploadedBy: userId,
        })),
      )
      .returning({ id: media.id });
    photos.track(sent.map((row) => row.id));
    const { stepId } = await draftOf(headers);
    // Two URLs asked at the 49th photo: the second confirmation would take the 51st place.
    const first = await photos.upload(headers, { ownerType: 'step', ownerId: stepId });
    const second = await photos.upload(headers, { ownerType: 'place', ownerId: placeId });
    expect((await photos.confirm(headers, first.mediaId)).statusCode).toBe(201);
    const refused = await photos.confirm(headers, second.mediaId);
    expect(refused.statusCode).toBe(429);
    expect(refused.json()).toMatchObject({ details: { reason: 'photo_upload', limit: 50 } });
    expect(widthsOf(second.mediaId)).toEqual([undefined, undefined, undefined]);
    expect(await app.db.select().from(media).where(eq(media.id, second.mediaId))).toEqual([]);
  });

  it('lists the photo sent in the export, by its public URL, never its path', async () => {
    const headers = await fixtures.signIn();
    const { routeId } = await draftOf(headers);
    const { ticket, confirmed } = await photos.sendPhoto(headers, {
      ownerType: 'route',
      ownerId: routeId,
    });
    expect(confirmed.statusCode).toBe(201);

    const exported = await app.inject({ url: '/v1/me/export', headers });
    const { createdRoutes } = MyDataExport.parse(exported.json());
    expect(createdRoutes).toMatchObject([
      { id: routeId, photoUrls: [`${testPhotoBase}/photos/${ticket.mediaId}/1600.jpg`] },
    ]);
    expect(exported.body).not.toContain(`"photos/${ticket.mediaId}"`);
  });
});
