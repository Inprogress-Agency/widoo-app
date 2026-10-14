import { routeTransitions, type RouteActor, type RouteStatus } from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes, userFeaturedRoutes, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { moveRoute } from './lifecycle';

// On copies of a demo route, featured by a fictitious account; all deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());
const now = new Date('2026-10-14T08:00:00.000Z');
let authorId: string;

beforeAll(async () => {
  app = await buildApp(testConfig());
  const [author] = await app.db
    .insert(users)
    .values({ firebaseUid: `fictitious-${uuidv7()}` })
    .returning({ id: users.id });
  if (!author) throw new Error('Author not created');
  authorId = author.id;
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.db.delete(users).where(eq(users.id, authorId));
  await app.close();
});

/** A route of the author in `status`, featured on the author's profile when published. */
async function routeIn(status: RouteStatus) {
  const id = await fixtures.copyDemoRoute({ authorId, status, publishedAt: null });
  if (status === 'published') {
    await app.db.delete(userFeaturedRoutes).where(eq(userFeaturedRoutes.userId, authorId));
    await app.db.insert(userFeaturedRoutes).values({ userId: authorId, routeId: id, position: 1 });
  }
  return id;
}

const move = (id: string, to: RouteStatus, actor: RouteActor) =>
  app.db.transaction(async (tx) => {
    const [route] = await tx.select().from(routes).where(eq(routes.id, id)).for('update');
    if (!route) throw new Error('Route missing');
    return moveRoute(tx, route, to, actor, now);
  });

const isFeatured = async (id: string) =>
  (
    await app.db
      .select()
      .from(userFeaturedRoutes)
      .where(and(eq(userFeaturedRoutes.userId, authorId), eq(userFeaturedRoutes.routeId, id)))
  ).length > 0;

describe('moveRoute', () => {
  const outOfPublished = routeTransitions.filter((transition) => transition.from === 'published');

  it.each(outOfPublished.flatMap(({ to, by }) => by.map((actor) => ({ to, actor }))))(
    'drops the featured rows of a route that leaves published for $to ($actor), in the move',
    async ({ to, actor }) => {
      const id = await routeIn('published');
      expect(await isFeatured(id)).toBe(true);
      const moved = await move(id, to, actor);
      expect(moved.status).toBe(to);
      expect(await isFeatured(id)).toBe(false);
    },
  );

  it('keeps the featured rows when the move is refused', async () => {
    const id = await routeIn('published');
    const refused = await move(id, 'draft', 'author').catch((error: unknown) => error);
    expect(refused).toMatchObject({ statusCode: 409, details: { status: 'published' } });
    expect(await isFeatured(id)).toBe(true);
    expect((await app.db.select().from(routes).where(eq(routes.id, id)))[0]?.status).toBe(
      'published',
    );
  });

  it('creates the private link on the first move to private, and keeps it', async () => {
    const id = await routeIn('draft');
    const { shareToken } = await move(id, 'private', 'author');
    expect(shareToken).toMatch(/^[\w-]{32}$/);
    const pending = await move(id, 'pending', 'author');
    expect(pending.shareToken).toBe(shareToken);
  });

  it('dates the first publication only', async () => {
    const id = await routeIn('pending');
    expect((await move(id, 'published', 'moderator')).publishedAt).toEqual(now);
  });
});
