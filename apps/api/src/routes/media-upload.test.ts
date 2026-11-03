import { ApiError, PhotoUploadTicket, photoUploadDailyLimit } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { editorFixtures } from '../editor/test-fixtures';
import { mediaFixtures, testPhotoBase } from '../media/test-fixtures';
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

describe('POST /media/upload-url', () => {
  it('signs one PUT of a photo, its type, size and owner with it, valid 15 minutes', async () => {
    const headers = await fixtures.signIn();
    const { stepId } = await draftOf(headers);
    const before = Date.now();
    const asked = await photos.askUploadUrl(headers, {
      ownerType: 'step',
      ownerId: stepId,
      contentType: 'image/png',
    });
    expect(asked.statusCode).toBe(200);
    expect(asked.headers['cache-control']).toBe('no-store');
    const ticket = PhotoUploadTicket.parse(asked.json());
    expect(ticket.headers).toEqual({
      'content-type': 'image/png',
      'x-goog-content-length-range': '0,10485760',
      'x-goog-meta-owner-type': 'step',
      'x-goog-meta-owner-id': stepId,
    });
    const lifetime = new Date(ticket.expiresAt).getTime() - before;
    expect(lifetime).toBeGreaterThan(14 * 60_000);
    expect(lifetime).toBeLessThanOrEqual(15 * 60_000 + 5000);
    // Nothing in the base before the confirmation.
    expect(await app.db.select().from(media).where(eq(media.id, ticket.mediaId))).toEqual([]);
  });

  it.each(['application/pdf', 'image/gif', 'image/svg+xml', 'text/plain'])(
    'refuses a %s before anything is sent',
    async (contentType) => {
      const headers = await fixtures.signIn();
      const { stepId } = await draftOf(headers);
      const asked = await photos.askUploadUrl(headers, {
        ownerType: 'step',
        ownerId: stepId,
        contentType,
      });
      expect(asked.statusCode).toBe(422);
      expect(ApiError.parse(asked.json())).toMatchObject({
        code: 'validation_error',
        details: { issues: [{ location: 'body', path: 'contentType' }] },
      });
    },
  );

  it.each(['revision', 'user'])('refuses a %s owner, left to its own ticket', async (ownerType) => {
    const headers = await fixtures.signIn();
    const asked = await photos.askUploadUrl(headers, {
      ownerType,
      ownerId: await accountOf(headers),
      contentType: 'image/jpeg',
    });
    expect(asked.statusCode).toBe(422);
  });

  it('answers 404 for the route or the step of another author, as the editor does', async () => {
    const { routeId, stepId } = await draftOf(await fixtures.signIn());
    const other = await fixtures.signIn();
    for (const [ownerType, ownerId] of [
      ['route', routeId],
      ['step', stepId],
      ['step', uuidv7()],
    ]) {
      const asked = await photos.askUploadUrl(other, {
        ownerType,
        ownerId,
        contentType: 'image/jpeg',
      });
      expect(asked.statusCode).toBe(404);
    }
  });

  it('refuses the 51st photo of the day, counted in the base', async () => {
    const headers = await fixtures.signIn();
    const userId = await accountOf(headers);
    const placeId = await photos.createPlace(headers, `Café quota ${uuidv7().slice(-8)}`);
    const ask = () =>
      photos.askUploadUrl(headers, {
        ownerType: 'place',
        ownerId: placeId,
        contentType: 'image/jpeg',
      });
    // Confirmed more than a day ago: they no longer count.
    await photos.confirmedBefore(
      userId,
      photoUploadDailyLimit,
      new Date(Date.now() - 25 * 3600_000),
    );
    expect((await ask()).statusCode).toBe(200);
    await photos.confirmedBefore(userId, photoUploadDailyLimit);
    const refused = await ask();
    expect(refused.statusCode).toBe(429);
    expect(refused.json()).toMatchObject({
      code: 'rate_limited',
      details: { reason: 'photo_upload', limit: 50 },
    });
  });
});

describe('without photo storage', () => {
  it('answers 503 media_unavailable on every photo route, the rest of the API working', async () => {
    // The configuration of staging today: no bucket, nothing injected.
    const bare = await buildApp(testConfig(), { tokenVerifier: verifier });
    try {
      const headers = await fixtures.signIn();
      const id = uuidv7();
      const answers = await Promise.all([
        bare.inject({
          method: 'POST',
          url: '/v1/media/upload-url',
          headers,
          payload: { ownerType: 'route', ownerId: id, contentType: 'image/jpeg' },
        }),
        bare.inject({ method: 'POST', url: `/v1/media/${id}/confirm`, headers }),
        bare.inject({ method: 'DELETE', url: `/v1/media/${id}`, headers }),
      ]);
      for (const answer of answers) {
        expect(answer.statusCode).toBe(503);
        expect(ApiError.parse(answer.json()).code).toBe('media_unavailable');
      }
      const anonymous = await bare.inject({ method: 'POST', url: '/v1/media/upload-url' });
      expect(anonymous.statusCode).toBe(401);
      expect((await bare.inject({ url: '/v1/me', headers })).statusCode).toBe(200);
    } finally {
      await bare.close();
    }
  });
});
