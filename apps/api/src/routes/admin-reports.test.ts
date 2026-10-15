import {
  AdminRouteReports,
  ApiError,
  type RouteReportReason,
  type RouteStatus,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, routeReports, routes, steps, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users and routes, and only those are listed or deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const createdReportIds: string[] = [];
const marker = `reporttest-${uuidv7()}`;
const hour = 60 * 60 * 1000;
const templateId = seedId('route:marais-gourmand');
const farAway = { lat: 33, lng: 33 };
const farAwayBounds = { west: 33, south: 33, east: 33.001, north: 33.001 };

let app: Awaited<ReturnType<typeof buildApp>>;
let authorId: string;
let reporterId: string;
let templateStepId: string;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  const create = async (firstName: string) => {
    const uid = `test-${uuidv7()}`;
    createdUids.push(uid);
    const [user] = await app.db.insert(users).values({ firebaseUid: uid, firstName }).returning();
    if (!user) throw new Error('User not created');
    return user.id;
  };
  authorId = await create('Camille');
  reporterId = await create('Lina');
  const [step] = await app.db
    .select({ id: steps.id })
    .from(steps)
    .where(eq(steps.routeId, templateId))
    .limit(1);
  if (!step) throw new Error('Demo step missing from the seed');
  templateStepId = step.id;
});
afterAll(async () => {
  await app.db.delete(adminActions).where(inArray(adminActions.targetId, createdReportIds));
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

/** A route copied from the seed, far from every zone the search tests look at. */
async function addRoute(status: RouteStatus, title: string) {
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
    title: `${title} ${marker}`,
  });
  return id;
}

async function addReport(
  routeId: string,
  reason: RouteReportReason,
  hoursAgo = 1,
  extra: { comment?: string; stepId?: string } = {},
) {
  const id = uuidv7();
  createdReportIds.push(id);
  await app.db.insert(routeReports).values({
    id,
    routeId,
    userId: reason === 'low_rating' ? null : reporterId,
    reason,
    comment: extra.comment ?? null,
    stepId: extra.stepId ?? null,
    createdAt: new Date(Date.now() - hoursAgo * hour),
  });
  return id;
}

const list = (headers: Record<string, string>, query = '') =>
  app.inject({ url: `/v1/admin/reports${query}`, headers });

describe('GET /v1/admin/reports', () => {
  it('is for moderators and admins, not for an editor', async () => {
    const editor = await signIn('editor');
    const response = await list(editor.headers);
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('lists the open reports, the oldest first, with route, author, reporter and step', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Signalé');
    const other = await addRoute('published', 'Autre');
    const recent = await addReport(route, 'inappropriate', 2);
    const old = await addReport(other, 'place_changed', 30, {
      comment: 'Fermé depuis mars',
      stepId: templateStepId,
    });
    await addReport(route, 'other', 5, { comment: 'Photo trompeuse' });

    const response = await list(moderator.headers);

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = AdminRouteReports.parse(response.json());
    const mine = body.items.filter((item) => item.route.title.includes(marker));
    expect(mine.map((item) => item.id)[0]).toBe(old);
    expect(mine.map((item) => item.id)).toContain(recent);
    expect(mine[0]).toMatchObject({
      reason: 'place_changed',
      comment: 'Fermé depuis mars',
      author: { id: authorId, firstName: 'Camille' },
      reporter: { id: reporterId, firstName: 'Lina' },
      openOnRoute: 1,
    });
    expect(mine[0]?.step?.placeName).toEqual(expect.any(String));
    expect(mine[0]?.route.isOfficial).toEqual(expect.any(Boolean));
    const twice = mine.find((item) => item.id === recent);
    expect(twice?.openOnRoute).toBe(2);
  });

  it('shows a low rating without a reporter, and filters by reason', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Note basse');
    const low = await addReport(route, 'low_rating', 3);
    await addReport(route, 'false_info', 2);

    const body = AdminRouteReports.parse(
      (await list(moderator.headers, '?reason=low_rating')).json(),
    );

    const item = body.items.find((report) => report.id === low);
    expect(item).toMatchObject({ reason: 'low_rating', reporter: null, step: null });
    expect(body.items.every((report) => report.reason === 'low_rating')).toBe(true);
  });

  it('refuses a reason it does not know', async () => {
    const moderator = await signIn('moderator');
    expect((await list(moderator.headers, '?reason=spam')).statusCode).toBe(400);
  });
});
