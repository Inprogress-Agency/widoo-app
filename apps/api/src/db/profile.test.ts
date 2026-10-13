import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testConfig } from '../test-config';
import { createDb, createSql } from './client';
import { anecdoteQuestions, routes, userAnecdotes, userFeaturedRoutes, users } from './schema';
import { seed } from './seed';
import { uuidv7 } from './uuid';

// Constraints of migration 0004 on the migrated test database, with fictitious rows only.
describe('profile tables', () => {
  const sql = createSql(testConfig().databaseUrl);
  const db = createDb(sql);
  const userId = uuidv7();
  const [first, second, third] = [uuidv7(), uuidv7(), uuidv7()];
  const routeIds = [first, second, third];

  beforeAll(async () => {
    // The CI database is migrated but not seeded: the seed gives the city, idempotently.
    const { cityId } = await seed(db);
    await db.insert(users).values({ id: userId, firebaseUid: `test-profile-${userId}` });
    await db.insert(routes).values(
      routeIds.map((id, n) => ({
        id,
        cityId,
        authorId: userId,
        status: 'published' as const,
        title: `Parcours de test ${n}`,
      })),
    );
  });
  afterAll(async () => {
    await db.delete(routes).where(inArray(routes.id, routeIds));
    await db.delete(users).where(eq(users.id, userId));
    await sql.end();
  });

  /** Name of the constraint a statement violates, or null when it succeeds. */
  const violated = async (statement: Promise<unknown>) => {
    try {
      await statement;
      return null;
    } catch (error) {
      const cause = (error as { cause?: { constraint_name?: string } }).cause;
      return cause?.constraint_name ?? (error as { constraint_name?: string }).constraint_name;
    }
  };
  const anecdote = (position: number, questionKey: string, answer = 'Le canal Saint-Martin.') =>
    db.insert(userAnecdotes).values({ userId, questionKey, answer, position });
  const featured = (position: number, routeId: string) =>
    db.insert(userFeaturedRoutes).values({ userId, routeId, position });

  it('holds the eight active questions of E-09, in the order of the sheet', async () => {
    const questions = await db
      .select({ key: anecdoteQuestions.key })
      .from(anecdoteQuestions)
      .where(eq(anecdoteQuestions.isActive, true))
      .orderBy(anecdoteQuestions.position);
    expect(questions.map((q) => q.key)).toEqual([
      'stroll_neighborhood',
      'ideal_sunday',
      'hidden_gem',
      'best_memory',
      'friends_visiting',
      'summer_must',
      'work_cafe',
      'favorite_street',
    ]);
  });

  it('gives a new account no badge and no override', async () => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user).toMatchObject({
      neighborhood: null,
      isCertified: false,
      certifiedOverride: 'none',
      certifiedAt: null,
    });
  });

  it('bounds the bio to 150 characters', async () => {
    const setBio = (bio: string) => db.update(users).set({ bio }).where(eq(users.id, userId));
    expect(await violated(setBio('é'.repeat(150)))).toBeNull();
    expect(await violated(setBio('a'.repeat(151)))).toBe('users_bio_length_check');
  });

  it('keeps anecdotes in positions 1 to 3, one per question, of 1 to 150 characters', async () => {
    expect(await violated(anecdote(1, 'ideal_sunday', 'a'.repeat(150)))).toBeNull();
    expect(await violated(anecdote(0, 'hidden_gem'))).toBe('user_anecdotes_position_check');
    expect(await violated(anecdote(4, 'hidden_gem'))).toBe('user_anecdotes_position_check');
    expect(await violated(anecdote(2, 'hidden_gem', 'a'.repeat(151)))).toBe(
      'user_anecdotes_answer_length_check',
    );
    expect(await violated(anecdote(2, 'hidden_gem', ''))).toBe(
      'user_anecdotes_answer_length_check',
    );
    expect(await violated(anecdote(1, 'hidden_gem'))).toBe('user_anecdotes_pkey');
    expect(await violated(anecdote(2, 'ideal_sunday'))).toBe('user_anecdotes_user_question_unique');
    expect(await violated(anecdote(2, 'unknown_question'))).toBe(
      'user_anecdotes_question_key_anecdote_questions_key_fk',
    );
  });

  it('keeps featured routes in positions 1 to 3, each route once', async () => {
    expect(await violated(featured(1, first))).toBeNull();
    expect(await violated(featured(2, second))).toBeNull();
    expect(await violated(featured(4, third))).toBe('user_featured_routes_position_check');
    expect(await violated(featured(1, third))).toBe('user_featured_routes_pkey');
    expect(await violated(featured(3, first))).toBe('user_featured_routes_user_route_unique');
  });

  it('drops a featured route with its route', async () => {
    await db.delete(routes).where(eq(routes.id, second));
    const rows = await db
      .select({ routeId: userFeaturedRoutes.routeId })
      .from(userFeaturedRoutes)
      .where(eq(userFeaturedRoutes.userId, userId));
    expect(rows).toEqual([{ routeId: first }]);
  });

  it('erases anecdotes and featured routes with the account, and keeps its routes', async () => {
    await db.delete(users).where(eq(users.id, userId));
    const left = async (table: typeof userAnecdotes | typeof userFeaturedRoutes) =>
      (await db.select().from(table).where(eq(table.userId, userId))).length;
    expect(await left(userAnecdotes)).toBe(0);
    expect(await left(userFeaturedRoutes)).toBe(0);
    const [route] = await db
      .select({ authorId: routes.authorId })
      .from(routes)
      .where(eq(routes.id, first));
    expect(route).toEqual({ authorId: null });
    await db.delete(routes).where(eq(routes.id, first));
  });
});
