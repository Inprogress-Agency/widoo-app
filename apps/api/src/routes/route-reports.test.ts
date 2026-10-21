import {
  ApiError,
  RouteDetail,
  RouteReportReceipt,
  type UserRouteReportReason,
} from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routeReports, steps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// On copies of the demo route, one per case: shared database, parallel files. Fictitious accounts
// are deleted afterwards with their reports.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier, directions: null });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

type Headers = Record<string, string>;

/** A signed-in account and its id. */
async function account() {
  const headers = await fixtures.signIn();
  const me = await app.inject({ url: '/v1/me', headers });
  return { headers, id: me.json<{ id: string }>().id };
}

const report = (routeId: string, headers: Headers, body: object) =>
  app.inject({ method: 'POST', url: `/v1/routes/${routeId}/reports`, headers, payload: body });
const firstStepOf = async (routeId: string) => {
  const [step] = await app.db.select().from(steps).where(eq(steps.routeId, routeId)).limit(1);
  if (!step) throw new Error('Step missing');
  return step.id;
};
const reportsOf = (routeId: string, userId: string) =>
  app.db
    .select()
    .from(routeReports)
    .where(and(eq(routeReports.routeId, routeId), eq(routeReports.userId, userId)));

describe('POST /v1/routes/:id/reports', () => {
  it('writes an open report and answers 201 with it', async () => {
    const reader = await account();
    const routeId = await fixtures.copyDemoRoute();

    const response = await report(routeId, reader.headers, { reason: 'inappropriate' });

    expect(response.statusCode).toBe(201);
    const receipt = RouteReportReceipt.parse(response.json());
    expect(receipt).toMatchObject({ reason: 'inappropriate', status: 'open' });
    expect(response.headers['cache-control']).toBe('no-store');
    const [row] = await reportsOf(routeId, reader.id);
    expect(row).toMatchObject({
      id: receipt.id,
      reason: 'inappropriate',
      status: 'open',
      stepId: null,
      comment: null,
    });
    expect(Object.keys(receipt).sort()).toEqual(['id', 'reason', 'reportedAt', 'status']);
  });

  it('keeps the step and the comment of « place_changed », and the comment of « other »', async () => {
    const reader = await account();
    const routeId = await fixtures.copyDemoRoute();
    const stepId = await firstStepOf(routeId);

    const changed = await report(routeId, reader.headers, {
      reason: 'place_changed',
      stepId,
      comment: 'Fermé depuis lundi',
    });
    expect(changed.statusCode).toBe(201);
    const other = await report(await fixtures.copyDemoRoute(), reader.headers, {
      reason: 'other',
      comment: 'Une autre raison',
    });
    expect(other.statusCode).toBe(201);

    const [row] = await reportsOf(routeId, reader.id);
    expect(row).toMatchObject({ stepId, comment: 'Fermé depuis lundi' });
  });

  it('answers 409 with the time of the first report, inside 7 days, and shows it on the sheet', async () => {
    const reader = await account();
    const routeId = await fixtures.copyDemoRoute();
    const first = RouteReportReceipt.parse(
      (await report(routeId, reader.headers, { reason: 'hidden_ad' })).json(),
    );

    const again = await report(routeId, reader.headers, { reason: 'false_info' });

    expect(again.statusCode).toBe(409);
    expect(ApiError.parse(again.json()).details).toEqual({ reportedAt: first.reportedAt });
    expect(await reportsOf(routeId, reader.id)).toHaveLength(1);
    const sheet = RouteDetail.parse(
      (await app.inject({ url: `/v1/routes/${routeId}`, headers: reader.headers })).json(),
    );
    expect(sheet.myReport).toEqual({ reportedAt: first.reportedAt, status: 'open' });
  });

  it('lets the reader report again once the team decided, and another reader report the route', async () => {
    const reader = await account();
    const other = await account();
    const routeId = await fixtures.copyDemoRoute();
    await report(routeId, reader.headers, { reason: 'copied_content' });
    await app.db
      .update(routeReports)
      .set({ status: 'rejected', reviewedAt: new Date() })
      .where(and(eq(routeReports.routeId, routeId), eq(routeReports.userId, reader.id)));

    expect((await report(routeId, reader.headers, { reason: 'copied_content' })).statusCode).toBe(
      201,
    );
    expect((await report(routeId, other.headers, { reason: 'copied_content' })).statusCode).toBe(
      201,
    );
  });

  it('answers 403 on the own route of the reader', async () => {
    const author = await account();
    const routeId = await fixtures.copyDemoRoute({ authorId: author.id });

    const response = await report(routeId, author.headers, { reason: 'inappropriate' });

    expect(response.statusCode).toBe(403);
    expect(await reportsOf(routeId, author.id)).toHaveLength(0);
  });

  it('answers 404 for a route that is not online, withdrawn or unknown, and 401 without a token', async () => {
    const reader = await account();
    const draft = await fixtures.copyDemoRoute({ status: 'draft' });
    const unpublished = await fixtures.copyDemoRoute({ status: 'unpublished' });
    const online = await fixtures.copyDemoRoute({ status: 'needs_fix' });

    expect(
      (await report(draft, reader.headers, { reason: 'other', comment: 'x' })).statusCode,
    ).toBe(404);
    expect(
      (await report(unpublished, reader.headers, { reason: 'other', comment: 'x' })).statusCode,
    ).toBe(404);
    expect(
      (await report(uuidv7(), reader.headers, { reason: 'other', comment: 'x' })).statusCode,
    ).toBe(404);
    // A route to correct stays online: it can be reported.
    expect((await report(online, reader.headers, { reason: 'inappropriate' })).statusCode).toBe(
      201,
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/routes/${online}/reports`,
          payload: { reason: 'inappropriate' },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('answers 422 for a body that breaks the rules of the reasons, and writes nothing', async () => {
    const reader = await account();
    const routeId = await fixtures.copyDemoRoute();
    const otherRoute = await fixtures.copyDemoRoute();
    const stepOfOther = await firstStepOf(otherRoute);
    const stepId = await firstStepOf(routeId);
    const bodies: object[] = [
      { reason: 'place_changed' },
      { reason: 'place_changed', stepId: stepOfOther },
      { reason: 'other' },
      { reason: 'other', comment: 'x'.repeat(81) },
      { reason: 'inappropriate', stepId },
      { reason: 'inappropriate', comment: 'Un mot' },
      { reason: 'low_rating' },
      { reason: 'inappropriate', unknown: true },
      {},
    ];

    for (const body of bodies) {
      const response = await report(routeId, reader.headers, body);
      expect(response.statusCode, JSON.stringify(body)).toBe(422);
    }
    expect(await reportsOf(routeId, reader.id)).toHaveLength(0);
    expect(
      (await report('not-an-id', reader.headers, { reason: 'inappropriate' })).statusCode,
    ).toBe(400);
  });

  it('writes one report when the same report is sent twice at once', async () => {
    const reader = await account();
    const routeId = await fixtures.copyDemoRoute();

    const answers = await Promise.all(
      Array.from({ length: 4 }, () => report(routeId, reader.headers, { reason: 'inappropriate' })),
    );

    expect(answers.map((response) => response.statusCode).sort()).toEqual([201, 409, 409, 409]);
    expect(await reportsOf(routeId, reader.id)).toHaveLength(1);
  });
});

const everyReason: UserRouteReportReason[] = [
  'inappropriate',
  'dangerous_place',
  'hidden_ad',
  'copied_content',
  'false_info',
];

describe('the reasons that take no step and no comment', () => {
  it.each(everyReason)('takes « %s » alone', async (reason) => {
    const reader = await account();
    const routeId = await fixtures.copyDemoRoute();

    expect((await report(routeId, reader.headers, { reason })).statusCode).toBe(201);
  });
});
