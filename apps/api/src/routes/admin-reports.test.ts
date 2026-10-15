import {
  AdminRouteReports,
  ApiError,
  ReportAlreadyDecidedDetails,
  ResolvedReport,
  type RouteReportReason,
  type RouteStatus,
  type UserRole,
} from '@widoo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, notifications, routeReports, routes, steps, users } from '../db/schema';
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
const resolve = (headers: Record<string, string>, id: string, payload: object) =>
  app.inject({ method: 'POST', url: `/v1/admin/reports/${id}/resolve`, headers, payload });
const titlesOf = (body: AdminRouteReports) =>
  body.items.map((item) => item.route.title).filter((title) => title.includes(marker));

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

  it('leaves out the reports the team already decided', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Décidé');
    const report = await addReport(route, 'inappropriate');
    await resolve(moderator.headers, report, { outcome: 'rejected' });

    const body = AdminRouteReports.parse((await list(moderator.headers)).json());

    expect(titlesOf(body)).not.toContain(`Décidé ${marker}`);
  });

  it('refuses a reason it does not know', async () => {
    const moderator = await signIn('moderator');
    expect((await list(moderator.headers, '?reason=spam')).statusCode).toBe(400);
  });
});

describe('POST /v1/admin/reports/:id/resolve', () => {
  it('accepts a report, thanks the reporter and writes the note in the journal', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Accepté');
    const report = await addReport(route, 'inappropriate');

    const response = await resolve(moderator.headers, report, {
      outcome: 'accepted',
      note: 'Photo retirée',
    });

    expect(response.statusCode).toBe(200);
    expect(ResolvedReport.parse(response.json())).toEqual({ id: report, status: 'accepted' });
    const [row] = await app.db.select().from(routeReports).where(eq(routeReports.id, report));
    expect(row).toMatchObject({ status: 'accepted', reviewedBy: moderator.id });
    expect(row?.reviewedAt).toBeInstanceOf(Date);
    const sent = await app.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, reporterId), eq(notifications.kind, 'report_resolved')));
    expect(sent.some((item) => (item.payload as { reportId?: string }).reportId === report)).toBe(
      true,
    );
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, report));
    expect(entry).toMatchObject({
      actorId: moderator.id,
      action: 'report.resolve',
      targetType: 'route_report',
      reason: 'Photo retirée',
    });
  });

  it('rejects a report without telling the reporter', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Rejeté');
    const report = await addReport(route, 'inappropriate');

    const response = await resolve(moderator.headers, report, { outcome: 'rejected' });

    expect(response.statusCode).toBe(200);
    const sent = await app.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, reporterId));
    expect(sent.some((item) => (item.payload as { reportId?: string }).reportId === report)).toBe(
      false,
    );
  });

  it('closes a low rating without a reporter to thank', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Gardé');
    const report = await addReport(route, 'low_rating');

    const response = await resolve(moderator.headers, report, { outcome: 'accepted' });

    expect(response.statusCode).toBe(200);
  });

  it('answers 409 already_decided with the status the first decision gave', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'Deux fois');
    const report = await addReport(route, 'inappropriate');
    await resolve(moderator.headers, report, { outcome: 'rejected' });

    const response = await resolve(moderator.headers, report, { outcome: 'accepted' });

    expect(response.statusCode).toBe(409);
    const error = ApiError.parse(response.json());
    expect(error.code).toBe('already_decided');
    expect(ReportAlreadyDecidedDetails.parse(error.details)).toEqual({ status: 'rejected' });
  });

  it('lets only one of two simultaneous decisions through', async () => {
    const [first, second] = await Promise.all([signIn('moderator'), signIn('admin')]);
    const route = await addRoute('published', 'Course');
    const report = await addReport(route, 'inappropriate');

    const answers = await Promise.all([
      resolve(first.headers, report, { outcome: 'accepted' }),
      resolve(second.headers, report, { outcome: 'rejected' }),
    ]);

    expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 409]);
    const journal = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, report));
    expect(journal).toHaveLength(1);
  });

  it('answers 404 to a report that does not exist, and 422 to an invalid body', async () => {
    const moderator = await signIn('moderator');
    expect((await resolve(moderator.headers, uuidv7(), { outcome: 'accepted' })).statusCode).toBe(
      404,
    );
    const route = await addRoute('published', 'Invalide');
    const report = await addReport(route, 'inappropriate');
    expect((await resolve(moderator.headers, report, { outcome: 'open' })).statusCode).toBe(422);
    expect(
      (await resolve(moderator.headers, report, { outcome: 'accepted', note: '<b>' })).statusCode,
    ).toBe(422);
  });

  it('is refused to an editor and leaves the report open', async () => {
    const editor = await signIn('editor');
    const route = await addRoute('published', 'Éditeur');
    const report = await addReport(route, 'inappropriate');

    expect((await resolve(editor.headers, report, { outcome: 'accepted' })).statusCode).toBe(403);
    const [row] = await app.db.select().from(routeReports).where(eq(routeReports.id, report));
    expect(row?.status).toBe('open');
  });
});

describe('POST /v1/admin/routes/:id/request-changes on a published route', () => {
  it('marks the route as to correct without taking it offline', async () => {
    const moderator = await signIn('moderator');
    const route = await addRoute('published', 'À corriger');

    const response = await app.inject({
      method: 'POST',
      url: `/v1/admin/routes/${route}/request-changes`,
      headers: moderator.headers,
      payload: { message: 'La note moyenne est trop basse : reprenez les étapes 2 et 3.' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ action: 'request_changes', status: 'needs_fix' });
    const [row] = await app.db.select().from(routes).where(eq(routes.id, route));
    expect(row?.status).toBe('needs_fix');
  });
});
