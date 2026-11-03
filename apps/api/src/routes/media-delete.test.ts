import { StoredPhoto } from '@widoo/shared';
import { and, asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media } from '../db/schema';
import { editorFixtures } from '../editor/test-fixtures';
import { mediaFixtures, testPhotoBase } from '../media/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: accounts, routes and photos of this file only.
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

type Headers = Record<string, string>;

const remove = (headers: Headers, id: string) =>
  app.inject({ method: 'DELETE', url: `/v1/media/${id}`, headers });

const widthsOf = (mediaId: string) =>
  [400, 800, 1600].map((width) => photos.storage.photos.has(`photos/${mediaId}/${width}.jpg`));

/** The first step of a new draft of the account, its photo of the draft at rank 0, and two sent. */
async function stepWithPhotos(headers: Headers) {
  const route = await fixtures.publishableDraft(headers);
  const stepId = route.steps[0]?.id ?? '';
  const sent: StoredPhoto[] = [];
  for (let index = 0; index < 2; index += 1) {
    const { confirmed } = await photos.sendPhoto(headers, { ownerType: 'step', ownerId: stepId });
    sent.push(StoredPhoto.parse(confirmed.json()));
  }
  return { routeId: route.id, stepId, sent };
}

const ranksOf = async (stepId: string) =>
  app.db
    .select({ id: media.id, position: media.position })
    .from(media)
    .where(and(eq(media.ownerType, 'step'), eq(media.ownerId, stepId)))
    .orderBy(asc(media.position));

describe('DELETE /media/:id', () => {
  it('deletes the photo, its widths, and moves the next photos up a rank', async () => {
    const headers = await fixtures.signIn();
    const { stepId, sent } = await stepWithPhotos(headers);
    const [first, second] = sent;
    if (!first || !second) throw new Error('Two photos were sent');
    expect([first.position, second.position]).toEqual([1, 2]);

    const deleted = await remove(headers, first.id);

    expect(deleted.statusCode).toBe(204);
    expect(deleted.headers['cache-control']).toBe('no-store');
    const ranks = await ranksOf(stepId);
    expect(ranks.map((row) => row.position)).toEqual([0, 1]);
    expect(ranks[1]?.id).toBe(second.id);
    expect(widthsOf(first.id)).toEqual([false, false, false]);
    expect(widthsOf(second.id)).toEqual([true, true, true]);
    expect((await remove(headers, first.id)).statusCode).toBe(404);
  });

  it('answers 404 to anyone but the author, and keeps the photo', async () => {
    const { stepId, sent } = await stepWithPhotos(await fixtures.signIn());
    const photo = sent[0];
    if (!photo) throw new Error('A photo was sent');
    expect((await remove(await fixtures.signIn(), photo.id)).statusCode).toBe(404);
    expect((await ranksOf(stepId)).map((row) => row.id)).toContain(photo.id);
    expect(widthsOf(photo.id)).toEqual([true, true, true]);
  });

  it('keeps the widths another row still holds, as a step photo copied to the route', async () => {
    const headers = await fixtures.signIn();
    const { routeId, sent } = await stepWithPhotos(headers);
    const photo = sent[0];
    if (!photo) throw new Error('A photo was sent');
    // The photos of a route start as the first photo of each step (D-050): the same object.
    const [copy] = await app.db
      .insert(media)
      .values({
        ownerType: 'route',
        ownerId: routeId,
        storagePath: `photos/${photo.id}`,
        width: photo.width,
        height: photo.height,
        position: 1,
      })
      .returning({ id: media.id });
    photos.track(copy ? [copy.id] : []);
    expect((await remove(headers, photo.id)).statusCode).toBe(204);
    expect(widthsOf(photo.id)).toEqual([true, true, true]);
  });
});
