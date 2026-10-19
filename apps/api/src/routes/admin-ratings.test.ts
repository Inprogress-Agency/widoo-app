import { AdminRatings, type UserRole } from '@widoo/shared';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routeRatings, users } from '../db/schema';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: every route is a copy of the demo, every account is new, and
// the lists are read for the routes of this file only.
const verifier = new TestTokenVerifier();
const teamUids: string[] = [];

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
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
