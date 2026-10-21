import {
  AlreadyDecidedDetails,
  ApiError,
  ModerationDecision,
  ModerationQueue,
  ModerationRouteDetail,
  type RouteStatus,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import {
  adminActions,
  moderationActionsTable,
  routes,
  userFeaturedRoutes,
  users,
} from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users and routes, searched by a marker in their title.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const marker = `modtest-${uuidv7()}`;
const hour = 60 * 60 * 1000;
const templateId = seedId('route:marais-gourmand');
const farAway = { lat: 32, lng: 32 };
const farAwayBounds = { west: 32, south: 32, east: 32.001, north: 32.001 };

let app: Awaited<ReturnType<typeof buildApp>>;
let authorId: string;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  const uid = `test-${uuidv7()}`;
  createdUids.push(uid);
  const [author] = await app.db
    .insert(users)
    .values({ firebaseUid: uid, firstName: 'Camille' })
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
  const [user] = await app.db
    .insert(users)
    .values({ firebaseUid: uid, role, email: 'julie.test@example.com' })
    .returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

/** A route copied from the seed, in `status`, last changed `hoursAgo` hours ago. */
async function addRoute(status: RouteStatus, hoursAgo = 1, title = 'Montmartre') {
  // Always the same demo route of the seed, never a row another test file is using, and far
  // from every zone the search tests look at: some of these copies are published.
  const [template] = await app.db.select().from(routes).where(eq(routes.id, templateId));
  if (!template) throw new Error('Demo route missing from the seed');
  const id = uuidv7();
  createdRouteIds.push(id);
  await app.db.insert(routes).values({
    ...template,
    id,
    authorId,
    shareToken: null,
    startLocation: farAway,
    bounds: farAwayBounds,
    status,
    publishedAt: null,
    title: `${title} ${marker}`,
    updatedAt: new Date(Date.now() - hoursAgo * hour),
  });
  return id;
}

const routeOf = async (id: string) =>
  (await app.db.select().from(routes).where(eq(routes.id, id)))[0];
const statusOf = async (id: string) =>
  (await app.db.select({ status: routes.status }).from(routes).where(eq(routes.id, id)))[0]?.status;
const queue = (headers: Record<string, string>, query = '') =>
  app.inject({ url: `/v1/admin/moderation?q=${marker}${query}`, headers });
const decide = (
  headers: Record<string, string>,
  id: string,
  action: string,
  payload?: Record<string, unknown>,
) => app.inject({ method: 'POST', url: `/v1/admin/routes/${id}/${action}`, headers, payload });

const refusal = { reasonCode: 'duplicate', message: 'Déjà publié sous un autre titre.' };

describe('GET /v1/admin/moderation', () => {
  it('refuses an editor, who does not open the moderation', async () => {
    const editor = await signIn('editor');
    const response = await queue(editor.headers);
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('lists what waits, the oldest first, with the author and the content', async () => {
    const moderator = await signIn('moderator');
    const recent = await addRoute('pending', 2, 'Récent');
    const old = await addRoute('pending', 80, 'Ancien');
    const toFix = await addRoute('changes_requested', 30, 'À corriger');
    await addRoute('published', 5, 'Publié');
    await addRoute('draft', 5, 'Brouillon');

    const response = await queue(moderator.headers);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = ModerationQueue.parse(response.json());
    expect(body.items.map((item) => item.id)).toEqual([old, toFix, recent]);
    expect(body.total).toBe(3);
    expect(body.items[0]).toMatchObject({
      status: 'pending',
      isRevision: false,
      author: { id: authorId, firstName: 'Camille', isCertified: false },
    });
    expect(body.items[0]?.stepCount).toBeGreaterThanOrEqual(0);
    expect(body.offset).toBe(0);
    expect(body.cities.length).toBeGreaterThanOrEqual(1);
    expect(body.nextCursor).toBeNull();
    expect(body.previousCursor).toBeNull();
  });

  it('filters by status and by lateness, and sorts the other way', async () => {
    const moderator = await signIn('moderator');
    const ids = async (query: string) =>
      ModerationQueue.parse((await queue(moderator.headers, query)).json()).items.map(
        (item) => item.title.split(' ')[0],
      );

    expect(await ids('&status=changes_requested')).toEqual(['À']);
    expect(await ids('&late=true')).toEqual(['Ancien']);
    expect(await ids('&sort=title&direction=desc')).toEqual(['Récent', 'Ancien', 'À']);
  });

  it('counts as late only a route waiting for its first look', async () => {
    const moderator = await signIn('moderator');
    await addRoute('changes_requested', 100, 'Renvoyé');
    const waiting = await addRoute('pending', 100, 'Attente');

    const late = ModerationQueue.parse((await queue(moderator.headers, '&late=true')).json());

    expect(late.items.map((item) => item.id)).toContain(waiting);
    expect(late.items.map((item) => item.title.split(' ')[0])).not.toContain('Renvoyé');
    const all = ModerationQueue.parse((await queue(moderator.headers)).json());
    const lateIds = new Set(late.items.map((item) => item.id));
    // The counter covers the whole queue, which other test files fill too: at least ours.
    expect(all.counts.late).toBeGreaterThanOrEqual(lateIds.size);
  });

  it('filters by city', async () => {
    const moderator = await signIn('moderator');
    const all = ModerationQueue.parse((await queue(moderator.headers)).json());
    const [city] = all.cities;
    if (!city) throw new Error('No city in the queue');

    const inCity = ModerationQueue.parse(
      (await queue(moderator.headers, `&city=${city.id}`)).json(),
    );
    expect(inCity.total).toBeGreaterThanOrEqual(1);
    expect(inCity.items.every((item) => item.cityName === city.name)).toBe(true);

    const elsewhere = await queue(moderator.headers, `&city=${uuidv7()}`);
    expect(ModerationQueue.parse(elsewhere.json()).items).toEqual([]);
  });

  it('finds no revision while revisions do not exist', async () => {
    const moderator = await signIn('moderator');
    const body = ModerationQueue.parse((await queue(moderator.headers, '&revision=true')).json());
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.counts.revisions).toBe(0);
  });

  it('counts each filter over the whole queue, whatever the search', async () => {
    const moderator = await signIn('moderator');
    const { counts } = ModerationQueue.parse((await queue(moderator.headers)).json());
    expect(counts.pending).toBeGreaterThanOrEqual(2);
    expect(counts.changesRequested).toBeGreaterThanOrEqual(1);
    expect(counts.late).toBeGreaterThanOrEqual(1);
  });

  it('refuses a filter it does not know', async () => {
    const moderator = await signIn('moderator');
    const response = await queue(moderator.headers, '&role=admin');
    expect(response.statusCode).toBe(400);
  });
});

describe('decisions', () => {
  it('publishes a pending route and keeps who did it, in both journals', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');

    const response = await decide(moderator.headers, id, 'publish');
    expect(response.statusCode).toBe(200);
    expect(ModerationDecision.parse(response.json())).toEqual({
      routeId: id,
      action: 'publish',
      status: 'published',
    });
    const [route] = await app.db.select().from(routes).where(eq(routes.id, id));
    expect(route?.status).toBe('published');
    expect(route?.publishedAt).toBeInstanceOf(Date);

    const history = await app.db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.routeId, id));
    expect(history).toMatchObject([{ action: 'publish', actorId: moderator.id }]);
    const journal = await app.db.select().from(adminActions).where(eq(adminActions.targetId, id));
    expect(journal).toMatchObject([
      {
        action: 'route.publish',
        actorId: moderator.id,
        targetType: 'route',
        before: { status: 'pending' },
        after: { status: 'published' },
      },
    ]);
  });

  it('asks for changes with a message to the author', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');
    const message = 'Ajoutez une photo de chaque étape.\nMerci !';

    const response = await decide(moderator.headers, id, 'request-changes', { message });
    expect(response.statusCode).toBe(200);
    expect(await statusOf(id)).toBe('changes_requested');
    const [action] = await app.db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.routeId, id));
    expect(action).toMatchObject({ action: 'request_changes', message });
  });

  it('refuses with a codified reason and a message', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');

    expect((await decide(moderator.headers, id, 'reject', refusal)).statusCode).toBe(200);
    expect(await statusOf(id)).toBe('rejected');
    const [action] = await app.db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.routeId, id));
    expect(action).toMatchObject({ action: 'reject', ...refusal });
  });

  it('unpublishes a published route: dated, and out of the profiles that featured it', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('published');
    const firstPublishedAt = new Date('2026-10-01T08:00:00Z');
    await app.db.update(routes).set({ publishedAt: firstPublishedAt }).where(eq(routes.id, id));
    await app.db.insert(userFeaturedRoutes).values({ userId: authorId, routeId: id, position: 1 });

    const before = Date.now();
    expect((await decide(moderator.headers, id, 'unpublish', refusal)).statusCode).toBe(200);
    const route = await routeOf(id);
    expect(route?.status).toBe('unpublished');
    expect(route?.unpublishedAt?.getTime()).toBeGreaterThanOrEqual(before);
    expect(route?.publishedAt).toEqual(firstPublishedAt);
    const featured = await app.db
      .select()
      .from(userFeaturedRoutes)
      .where(eq(userFeaturedRoutes.routeId, id));
    expect(featured).toEqual([]);
  });

  it('unpublishes a route to fix', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('needs_fix');

    expect((await decide(moderator.headers, id, 'unpublish', refusal)).statusCode).toBe(200);
    expect(await statusOf(id)).toBe('unpublished');
  });

  it('keeps the date of the first publication when a route is published again', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');
    const firstPublishedAt = new Date('2026-10-01T08:00:00Z');
    await app.db.update(routes).set({ publishedAt: firstPublishedAt }).where(eq(routes.id, id));

    expect((await decide(moderator.headers, id, 'publish')).statusCode).toBe(200);
    expect((await routeOf(id))?.publishedAt).toEqual(firstPublishedAt);
  });

  it('dates the first publication', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');

    const before = Date.now();
    expect((await decide(moderator.headers, id, 'publish')).statusCode).toBe(200);
    expect((await routeOf(id))?.publishedAt?.getTime()).toBeGreaterThanOrEqual(before);
  });

  it.each<[string, RouteStatus, Record<string, unknown> | undefined]>([
    ['publish', 'unpublished', undefined],
    ['publish', 'draft', undefined],
    ['reject', 'published', refusal],
    ['request-changes', 'rejected', { message: 'À reprendre.' }],
    ['unpublish', 'pending', refusal],
    ['unpublish', 'private', refusal],
  ])('refuses to %s a route %s, outside its life cycle', async (action, status, payload) => {
    const moderator = await signIn('moderator');
    const id = await addRoute(status);

    const response = await decide(moderator.headers, id, action, payload);
    expect(response.statusCode).toBe(409);
    expect(ApiError.parse(response.json()).code).toBe('already_decided');
    expect(await statusOf(id)).toBe(status);
  });

  it.each([
    ['a missing message', 'request-changes', {}],
    ['markup in the message', 'request-changes', { message: '<b>non</b>' }],
    ['an unknown reason', 'reject', { reasonCode: 'ugly', message: 'Non.' }],
    ['a refusal without message', 'reject', { reasonCode: 'duplicate' }],
  ])('refuses %s and leaves the route as it was', async (_, action, payload) => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');

    // An invalid body is a 422 (wiki API › Conventions, D-071); an invalid query stays a 400.
    expect((await decide(moderator.headers, id, action, payload)).statusCode).toBe(422);
    expect(await statusOf(id)).toBe('pending');
  });

  it('answers 404 for a route that does not exist', async () => {
    const moderator = await signIn('moderator');
    expect((await decide(moderator.headers, uuidv7(), 'publish')).statusCode).toBe(404);
  });

  it('refuses an editor, and writes nothing', async () => {
    const editor = await signIn('editor');
    const id = await addRoute('pending');

    expect((await decide(editor.headers, id, 'publish')).statusCode).toBe(403);
    expect(await statusOf(id)).toBe('pending');
  });

  it('tells the second moderator what the first one decided, and writes nothing twice', async () => {
    const first = await signIn('moderator');
    const second = await signIn('admin');
    const id = await addRoute('pending');

    const answers = await Promise.all([
      decide(first.headers, id, 'publish'),
      decide(second.headers, id, 'reject', refusal),
    ]);
    const statuses = answers.map((answer) => answer.statusCode).sort();
    expect(statuses).toEqual([200, 409]);

    const late = answers.find((answer) => answer.statusCode === 409);
    const error = ApiError.parse(late?.json());
    expect(error.code).toBe('already_decided');
    expect(AlreadyDecidedDetails.parse(error.details).status).toBe(await statusOf(id));

    const history = await app.db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.routeId, id));
    expect(history).toHaveLength(1);
    const journal = await app.db.select().from(adminActions).where(eq(adminActions.targetId, id));
    expect(journal).toHaveLength(1);
  });
});

describe('GET /v1/admin/routes/:id', () => {
  const sheet = (headers: Record<string, string>, id: string) =>
    app.inject({ url: `/v1/admin/routes/${id}`, headers });

  it('gives the route as it will be published, its author and its place in the queue', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending', 200, 'Fiche');

    const response = await sheet(moderator.headers, id);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const route = ModerationRouteDetail.parse(response.json());
    expect(route).toMatchObject({
      id,
      status: 'pending',
      isRevision: false,
      author: { id: authorId, firstName: 'Camille', isCertified: false },
    });
    expect(route.title).toContain('Fiche');
    expect(route.premiumMinSteps).toBe(4);
    expect(route.revisionChanges).toEqual([]);
    expect(route.author?.reportsReceivedCount).toBe(0);
    expect(route.isPremiumComputed).toBe(route.steps.length >= 4);
    expect(route.queue?.position).toBeGreaterThanOrEqual(1);
    expect(route.queue?.total).toBeGreaterThanOrEqual(route.queue?.position ?? 0);
  });

  it('keeps the history of the decisions, the most recent first', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');
    await decide(moderator.headers, id, 'reject', refusal);

    const route = ModerationRouteDetail.parse((await sheet(moderator.headers, id)).json());
    expect(route.status).toBe('rejected');
    expect(route.queue).toBeNull();
    // The moderator of this test has no first name: the start of the address stands for it.
    expect(route.history).toMatchObject([
      { action: 'reject', actorName: 'julie.test', ...refusal },
    ]);
  });

  it('counts what the author already published and was refused', async () => {
    const moderator = await signIn('moderator');
    const id = await addRoute('pending');
    const { author } = ModerationRouteDetail.parse((await sheet(moderator.headers, id)).json());
    expect(author?.publishedRouteCount).toBeGreaterThanOrEqual(1);
    expect(author?.rejectedRouteCount).toBeGreaterThanOrEqual(1);
  });

  it('answers 404 for a route that does not exist, and 403 to an editor', async () => {
    const moderator = await signIn('moderator');
    const editor = await signIn('editor');
    const id = await addRoute('pending');
    expect((await sheet(moderator.headers, uuidv7())).statusCode).toBe(404);
    expect((await sheet(editor.headers, id)).statusCode).toBe(403);
  });
});
