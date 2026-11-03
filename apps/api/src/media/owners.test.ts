import type { UploadOwnerType, UserRole } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media, routes } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { demoPlaceIds, editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';
import { lockPhotoOwner, nextPhotoPosition } from './owners';
import { mediaFixtures } from './test-fixtures';

// Shared database, parallel files: accounts, routes, places and photos of this file only.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = editorFixtures(() => app, verifier);
const photos = mediaFixtures(() => app);

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await photos.cleanUp();
  await fixtures.cleanUp();
  await app.close();
});

/** A signed-in account and who it is for the checks: its id and role. */
async function account(role: UserRole = 'user') {
  const headers = await fixtures.signIn(role);
  const { id } = (await app.inject({ url: '/v1/me', headers })).json<{ id: string }>();
  return { headers, user: { id, role } };
}

/** A draft of the account, with a photo on the route and on each step, and its first step. */
async function draftOf(headers: Record<string, string>) {
  const route = await fixtures.publishableDraft(headers);
  return { routeId: route.id, stepId: route.steps[0]?.id ?? '' };
}

const lock = (user: { id: string; role: UserRole }, ownerType: UploadOwnerType, id: string) =>
  app.db.transaction((tx) => lockPhotoOwner(tx, user, ownerType, id));
const next = (ownerType: UploadOwnerType, ownerId: string) =>
  app.db.transaction((tx) => nextPhotoPosition(tx, ownerType, ownerId));

describe('lockPhotoOwner', () => {
  it('lets the author change the photos of a draft and of its steps', async () => {
    const { headers, user } = await account();
    const { routeId, stepId } = await draftOf(headers);
    await expect(lock(user, 'route', routeId)).resolves.toBeUndefined();
    await expect(lock(user, 'step', stepId)).resolves.toBeUndefined();
  });

  it('answers 404 for the route or step of another author, as the editor does', async () => {
    const { routeId, stepId } = await draftOf((await account()).headers);
    const { user } = await account();
    for (const [ownerType, ownerId] of [
      ['route', routeId],
      ['step', stepId],
      ['step', uuidv7()],
    ] as const) {
      await expect(lock(user, ownerType, ownerId)).rejects.toMatchObject({ statusCode: 404 });
    }
  });

  it('answers 409 for a published route, whose photos change with its revision (#434)', async () => {
    const { headers, user } = await account();
    const { routeId, stepId } = await draftOf(headers);
    await app.db.update(routes).set({ status: 'published' }).where(eq(routes.id, routeId));
    for (const [ownerType, ownerId] of [
      ['route', routeId],
      ['step', stepId],
    ] as const) {
      await expect(lock(user, ownerType, ownerId)).rejects.toMatchObject({
        statusCode: 409,
        details: { status: 'published' },
      });
    }
  });

  it('opens a place to its creator while only their routes use it, to a moderator always', async () => {
    const creator = await account();
    const placeId = await photos.createPlace(creator.headers, `Café ${uuidv7().slice(-8)}`);
    await expect(lock(creator.user, 'place', placeId)).resolves.toBeUndefined();
    await expect(lock((await account()).user, 'place', placeId)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(lock((await account('moderator')).user, 'place', placeId)).resolves.toBe(
      undefined,
    );
    // A place of the demo, used by the routes of others.
    await expect(lock(creator.user, 'place', demoPlaceIds[0] ?? '')).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(lock(creator.user, 'place', uuidv7())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('nextPhotoPosition', () => {
  const fill = (ownerType: UploadOwnerType, ownerId: string, positions: number[]) =>
    app.db.insert(media).values(
      positions.map((position) => ({
        ownerType,
        ownerId,
        storagePath: `photos/${uuidv7()}`,
        width: 1600,
        height: 1067,
        position,
      })),
    );

  it('puts a photo after the last one, up to 5 for a step and 6 for a route', async () => {
    const { routeId, stepId } = await draftOf((await account()).headers);
    expect(await next('step', stepId)).toBe(1);
    await fill('step', stepId, [1, 2, 3, 4]);
    await fill('route', routeId, [1, 2, 3, 4, 5]);
    for (const [ownerType, ownerId, limit] of [
      ['step', stepId, 5],
      ['route', routeId, 6],
    ] as const) {
      await expect(next(ownerType, ownerId)).rejects.toMatchObject({
        statusCode: 409,
        details: { reason: 'photos_full', limit },
      });
    }
  });

  it('bounds no place, the spec giving no maximum', async () => {
    const creator = await account();
    const placeId = await photos.createPlace(creator.headers, `Café ${uuidv7().slice(-8)}`);
    await fill('place', placeId, [0, 1, 2, 3, 4, 5, 6, 7]);
    expect(await next('place', placeId)).toBe(8);
  });
});
