import {
  ApiError,
  CatalogRouteAction,
  CatalogRoutes,
  type RouteStatus,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, moderationActionsTable, routes, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users and routes, found by a marker in their title, far
// from every zone the search tests look at.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const marker = `cattest-${uuidv7()}`;
const templateId = seedId('route:marais-gourmand');
const farAway = { lat: 33, lng: 33 };
const farAwayBounds = { west: 33, south: 33, east: 33.001, north: 33.001 };

let app: Awaited<ReturnType<typeof buildApp>>;
let authorId: string;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  const uid = `test-${uuidv7()}`;
  createdUids.push(uid);
  const [author] = await app.db
    .insert(users)
    .values({ firebaseUid: uid, firstName: 'Nadia' })
    .returning();
  if (!author) throw new Error('Author not created');
  authorId = author.id;
});
afterAll(async () => {
  await app.db.delete(adminActions).where(inArray(adminActions.targetId, createdRouteIds));
  await app.db.delete(routes).where(inArray(routes.id, createdRouteIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  const [user] = await app.db.insert(users).values({ firebaseUid: uid, role }).returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

type RouteOptions = { status?: RouteStatus; isOfficial?: boolean; rating?: number };

/** A route copied from the seed: of an author unless `isOfficial`, published unless told. */
async function addRoute(title: string, options: RouteOptions = {}) {
  const [template] = await app.db.select().from(routes).where(eq(routes.id, templateId));
  if (!template) throw new Error('Demo route missing from the seed');
  const id = uuidv7();
  createdRouteIds.push(id);
  const isOfficial = options.isOfficial ?? false;
  await app.db.insert(routes).values({
    ...template,
    id,
    shareToken: null,
    startLocation: farAway,
    bounds: farAwayBounds,
    title: `${title} ${marker}`,
    status: options.status ?? 'published',
    isOfficial,
    authorId: isOfficial ? null : authorId,
    stats: options.rating ? { rating_avg: options.rating, rating_count: 4 } : {},
  });
  return id;
}

const routeOf = async (id: string) =>
  (await app.db.select().from(routes).where(eq(routes.id, id)))[0];
const list = (headers: Record<string, string>, query = '') =>
  app.inject({ url: `/v1/admin/routes?q=${marker}${query}`, headers });
const titles = async (headers: Record<string, string>, query = '') =>
  CatalogRoutes.parse((await list(headers, query)).json()).items.map(
    (route) => route.title.split(' ')[0],
  );
const act = (headers: Record<string, string>, id: string, action: string, payload?: object) =>
  app.inject({ method: 'POST', url: `/v1/admin/routes/${id}/${action}`, headers, payload });

describe('GET /v1/admin/routes', () => {
  it('lists the routes whatever their status, with author, city and rating', async () => {
    const moderator = await signIn('moderator');
    await addRoute('Alpha', { rating: 4.5 });
    await addRoute('Bravo', { status: 'unpublished' });
    await addRoute('Charlie', { isOfficial: true, status: 'draft' });

    const response = await list(moderator.headers, '&sort=title&direction=asc');
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = CatalogRoutes.parse(response.json());
    expect(body.items.map((route) => route.title.split(' ')[0])).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
    expect(body.total).toBe(3);
    expect(body.items[0]).toMatchObject({
      status: 'published',
      isOfficial: false,
      author: { id: authorId, firstName: 'Nadia' },
      rating: { average: 4.5, count: 4 },
    });
    expect(body.items[2]).toMatchObject({ isOfficial: true, author: null });
  });

  it('filters by status and sorts by rating, unrated routes last', async () => {
    const admin = await signIn('admin');
    expect(await titles(admin.headers, '&status=unpublished')).toEqual(['Bravo']);
    expect((await titles(admin.headers, '&sort=rating&direction=desc'))[0]).toBe('Alpha');
    expect((await titles(admin.headers, '&sort=rating&direction=asc'))[0]).toBe('Alpha');
  });

  it('shows an editor the routes of the team only', async () => {
    const editor = await signIn('editor');
    expect(await titles(editor.headers)).toEqual(['Charlie']);
  });

  it('refuses an account outside the team, and a filter it does not know', async () => {
    const admin = await signIn('admin');
    expect((await list((await signIn('user')).headers)).statusCode).toBe(403);
    expect((await list(admin.headers, '&status=online')).statusCode).toBe(400);
  });
});

describe('POST /v1/admin/routes/:id/republish', () => {
  const body = { message: 'Lieu rouvert, vérifié sur place.' };

  it('puts an unpublished route back online, and keeps why in both journals', async () => {
    const admin = await signIn('admin');
    const id = await addRoute('Retour', { status: 'unpublished' });

    const response = await act(admin.headers, id, 'republish', body);
    expect(response.statusCode).toBe(200);
    expect(CatalogRouteAction.parse(response.json())).toMatchObject({ status: 'published' });
    expect((await routeOf(id))?.status).toBe('published');

    const history = await app.db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.routeId, id));
    expect(history).toMatchObject([{ action: 'publish', actorId: admin.id, ...body }]);
    const journal = await app.db.select().from(adminActions).where(eq(adminActions.targetId, id));
    expect(journal).toMatchObject([
      {
        action: 'route.republish',
        before: { status: 'unpublished' },
        after: { status: 'published' },
        reason: body.message,
      },
    ]);
  });

  it('answers 409 for a route that is not unpublished, and writes nothing', async () => {
    const admin = await signIn('admin');
    const id = await addRoute('Encore', { status: 'published' });

    const response = await act(admin.headers, id, 'republish', body);
    expect(response.statusCode).toBe(409);
    expect(ApiError.parse(response.json()).code).toBe('already_decided');
    const journal = await app.db.select().from(adminActions).where(eq(adminActions.targetId, id));
    expect(journal).toEqual([]);
  });

  it('is for admins only, and needs a reason', async () => {
    const moderator = await signIn('moderator');
    const admin = await signIn('admin');
    const id = await addRoute('Garde', { status: 'unpublished' });

    expect((await act(moderator.headers, id, 'republish', body)).statusCode).toBe(403);
    // An invalid body is a 422 (wiki API › Conventions, D-071).
    expect((await act(admin.headers, id, 'republish', {})).statusCode).toBe(422);
    expect((await routeOf(id))?.status).toBe('unpublished');
  });
});

describe('POST /v1/admin/routes/:id/reassign', () => {
  it('hands a route over to the team, once', async () => {
    const admin = await signIn('admin');
    const id = await addRoute('Transfert');

    const first = await act(admin.headers, id, 'reassign');
    expect(first.statusCode).toBe(200);
    expect(CatalogRouteAction.parse(first.json())).toMatchObject({
      status: 'published',
      isOfficial: true,
    });
    expect(await routeOf(id)).toMatchObject({ isOfficial: true, authorId: null });

    expect((await act(admin.headers, id, 'reassign')).statusCode).toBe(200);
    const journal = await app.db.select().from(adminActions).where(eq(adminActions.targetId, id));
    expect(journal).toMatchObject([
      {
        action: 'route.reassign',
        actorId: admin.id,
        before: { isOfficial: false, authorId },
        after: { isOfficial: true, authorId: null },
      },
    ]);
  });

  it('is for admins only, and answers 404 for an unknown route', async () => {
    const moderator = await signIn('moderator');
    const admin = await signIn('admin');
    const id = await addRoute('Intact');

    expect((await act(moderator.headers, id, 'reassign')).statusCode).toBe(403);
    expect((await routeOf(id))?.isOfficial).toBe(false);
    expect((await act(admin.headers, uuidv7(), 'reassign')).statusCode).toBe(404);
  });
});
