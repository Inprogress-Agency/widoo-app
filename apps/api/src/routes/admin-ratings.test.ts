import {
  AdminRatings,
  ApiError,
  RatingActionResult,
  RatingAlreadyDecidedDetails,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, routeRatings, routes, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: every route is a copy of the demo, every account is new, and
// the lists are read for the routes of this file only.
const verifier = new TestTokenVerifier();
const teamUids: string[] = [];
const ratingIds: string[] = [];

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.db.delete(adminActions).where(inArray(adminActions.targetId, ratingIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, teamUids));
  await app.close();
});

async function signInTeam(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  teamUids.push(uid);
  const [user] = await app.db.insert(users).values({ firebaseUid: uid, role }).returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

/** A rating of `routeId` by a new account named `firstName`. */
async function addRating(
  routeId: string,
  firstName: string,
  rating: number,
  comment: string | null,
  createdAt: Date,
) {
  const [author] = await app.db
    .insert(users)
    .values({ firebaseUid: `fixture-${firstName}-${createdAt.getTime()}-${routeId}`, firstName })
    .returning();
  if (!author) throw new Error('Author not created');
  teamUids.push(author.firebaseUid);
  const [row] = await app.db
    .insert(routeRatings)
    .values({ routeId, userId: author.id, rating, comment, createdAt })
    .returning();
  if (!row) throw new Error('Rating not created');
  ratingIds.push(row.id);
  return row;
}

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

describe('GET /v1/admin/ratings', () => {
  it('lists the ratings with a comment of a route, the latest first, masked ones too', async () => {
    const moderator = await signInTeam('moderator');
    const routeId = await fixtures.copyDemoRoute();
    await addRating(routeId, 'Ana', 5, 'Superbe', day(1));
    await addRating(routeId, 'Ben', 3, null, day(2));
    const hidden = await addRating(routeId, 'Chloé', 1, 'Nul', day(3));
    await app.db
      .update(routeRatings)
      .set({ status: 'hidden' })
      .where(inArray(routeRatings.id, [hidden.id]));

    const response = await app.inject({
      url: `/v1/admin/ratings?routeId=${routeId}`,
      headers: moderator.headers,
    });

    expect(response.statusCode).toBe(200);
    const body = AdminRatings.parse(response.json());
    expect(body.total).toBe(2);
    expect(body.items.map((item) => [item.author?.firstName, item.comment, item.isHidden])).toEqual(
      [
        ['Chloé', 'Nul', true],
        ['Ana', 'Superbe', false],
      ],
    );
    expect(body.items[0]?.route.id).toBe(routeId);
    expect(body.routes.map((route) => route.id)).toContain(routeId);
  });

  it('filters by note', async () => {
    const moderator = await signInTeam('moderator');
    const routeId = await fixtures.copyDemoRoute();
    await addRating(routeId, 'Dan', 4, 'Bien', day(1));
    await addRating(routeId, 'Eve', 2, 'Moyen', day(2));

    const response = await app.inject({
      url: `/v1/admin/ratings?routeId=${routeId}&rating=2`,
      headers: moderator.headers,
    });

    expect(AdminRatings.parse(response.json()).items.map((item) => item.comment)).toEqual([
      'Moyen',
    ]);
  });

  it('is refused to an editor', async () => {
    const editor = await signInTeam('editor');
    const response = await app.inject({ url: '/v1/admin/ratings', headers: editor.headers });
    expect(response.statusCode).toBe(403);
  });
});

const act = (
  headers: Record<string, string>,
  ratingId: string,
  action: 'hide' | 'unhide',
  payload?: object,
) =>
  app.inject({ method: 'POST', url: `/v1/admin/ratings/${ratingId}/${action}`, headers, payload });
const statsOf = async (routeId: string) =>
  (await app.db.select({ stats: routes.stats }).from(routes).where(eq(routes.id, routeId)))[0]
    ?.stats;

describe('POST /v1/admin/ratings/:id/hide and unhide', () => {
  it('masks a rating out of the average of its route, journals it, and restores it', async () => {
    const moderator = await signInTeam('moderator');
    const routeId = await fixtures.copyDemoRoute();
    await addRating(routeId, 'Fay', 5, 'Top', day(1));
    const masked = await addRating(routeId, 'Gus', 1, 'Pas bien', day(2));

    const hidden = await act(moderator.headers, masked.id, 'hide', { reason: 'Insulte.' });

    expect(hidden.statusCode).toBe(200);
    expect(RatingActionResult.parse(hidden.json())).toEqual({
      id: masked.id,
      isHidden: true,
      routeRating: { average: 5, count: 1 },
    });
    expect(await statsOf(routeId)).toMatchObject({ rating_avg: 5, rating_count: 1 });
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, masked.id));
    expect(entry).toMatchObject({
      action: 'rating.hide',
      actorId: moderator.id,
      reason: 'Insulte.',
    });

    const restored = await act(moderator.headers, masked.id, 'unhide');

    expect(RatingActionResult.parse(restored.json())).toEqual({
      id: masked.id,
      isHidden: false,
      routeRating: { average: 3, count: 2 },
    });
    expect(await statsOf(routeId)).toMatchObject({ rating_avg: 3, rating_count: 2 });
  });

  it('answers 409 already_decided to a second decision, with the status it has', async () => {
    const moderator = await signInTeam('moderator');
    const routeId = await fixtures.copyDemoRoute();
    const rating = await addRating(routeId, 'Hal', 2, 'Bof', day(1));

    const again = await act(moderator.headers, rating.id, 'unhide');

    expect(again.statusCode).toBe(409);
    const error = ApiError.parse(again.json());
    expect(error.code).toBe('already_decided');
    expect(RatingAlreadyDecidedDetails.parse(error.details)).toEqual({ status: 'visible' });
  });

  it('asks for a reason, answers 404 to an unknown rating, and refuses an editor', async () => {
    const moderator = await signInTeam('moderator');
    const editor = await signInTeam('editor');
    const routeId = await fixtures.copyDemoRoute();
    const rating = await addRating(routeId, 'Ida', 2, 'Bof', day(1));

    expect((await act(moderator.headers, rating.id, 'hide', {})).statusCode).toBe(422);
    expect((await act(moderator.headers, uuidv7(), 'hide', { reason: 'Non.' })).statusCode).toBe(
      404,
    );
    expect((await act(editor.headers, rating.id, 'hide', { reason: 'Non.' })).statusCode).toBe(403);
  });
});
