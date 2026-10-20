import { ApiError, budgetBucketOf, RouteDetail, type RouteStatus } from '@widoo/shared';
import { and, eq, gt } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { media, places, routeReports, routes, steps, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { ROUTE_SHEET_RATE_LIMIT } from './route-sheet';

// On copies of the demo route « Marais gourmand », one per case: shared database, parallel files.
// Fictitious accounts and link tokens; everything is deleted afterwards.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
// One link token per copy: `share_token` is unique.
const tokens = new Map<string, string>();
const linkOf = (id: string) => tokens.get(id) ?? '';
const day = 24 * 60 * 60 * 1000;
let author: { headers: Record<string, string>; id: string };

/** A signed-in account and its id. */
async function account(values: Partial<typeof users.$inferInsert> = {}) {
  const headers = await fixtures.signIn(values);
  const me = await app.inject({ url: '/v1/me', headers });
  return { headers, id: me.json<{ id: string }>().id };
}

async function copy(status: RouteStatus, values: Partial<typeof routes.$inferInsert> = {}) {
  const shareToken = `Fictitious_${uuidv7().replaceAll('-', '')}`;
  const id = await fixtures.copyDemoRoute({ authorId: author.id, status, shareToken, ...values });
  tokens.set(id, shareToken);
  return id;
}
const get = (url: string, headers: Record<string, string> = {}) =>
  app.inject({ url: `/v1/routes/${url}`, headers });
const sheetOf = (body: string) => RouteDetail.parse(JSON.parse(body));

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier, directions: null });
  author = await account({ firstName: 'Camille' });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

describe('GET /v1/routes/:id, who reads what (D-093)', () => {
  it.each(['published', 'needs_fix'] as const)('serves a %s route to anyone', async (status) => {
    const id = await copy(status, { publishedAt: new Date() });
    for (const url of [id, `${id}?token=${linkOf(id)}`]) {
      const response = await get(url);
      expect(response.statusCode).toBe(200);
      expect(sheetOf(response.body)).toMatchObject({ id, status, sharedBy: null });
    }
  });

  it.each(['private', 'pending', 'changes_requested'] as const)(
    'serves a %s route never published with its link only, saying who shared it',
    async (status) => {
      const id = await copy(status, { publishedAt: null });
      expect((await get(id)).statusCode).toBe(404);
      const response = await get(`${id}?token=${linkOf(id)}`);
      expect(response.statusCode).toBe(200);
      expect(sheetOf(response.body)).toMatchObject({ status, sharedBy: { firstName: 'Camille' } });
    },
  );

  it('answers 404 to a pending route published once, even with its link (Q3)', async () => {
    const id = await copy('pending', { publishedAt: new Date(Date.now() - day) });
    expect((await get(`${id}?token=${linkOf(id)}`)).statusCode).toBe(404);
  });

  it.each(['draft', 'rejected'] as const)('answers 404 to a %s route, link or not', async (s) => {
    const id = await copy(s);
    expect((await get(id)).statusCode).toBe(404);
    expect((await get(`${id}?token=${linkOf(id)}`)).statusCode).toBe(404);
    expect((await get(id, author.headers)).statusCode).toBe(404);
  });

  it('answers the same 404, never 403, to a wrong token and to an unknown route', async () => {
    const id = await copy('private');
    const wrong = await get(`${id}?token=${linkOf(id).replace('F', 'G')}`);
    const unknown = await get('0192f0a0-0000-7000-8000-00000000dead');
    expect(wrong.statusCode).toBe(404);
    expect(wrong.json()).toEqual(unknown.json());
    expect(ApiError.parse(wrong.json()).code).toBe('not_found');
    expect(wrong.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['a malformed id', 'not-a-uuid'],
    ['an unknown key', '0192f0a0-0000-7000-8000-00000000dead?lang=fr'],
    ['another trips value', '0192f0a0-0000-7000-8000-00000000dead?trips=exact'],
  ])('answers 400 validation_error to %s', async (_, url) => {
    const response = await get(url);
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });

  it('answers 401 to a Firebase token the verifier refuses', async () => {
    const id = await copy('published');
    const response = await get(id, { authorization: 'Bearer fictitious-token' });
    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain(id);
  });

  it('serves the author their private route without its link, and nothing shared', async () => {
    const id = await copy('private');
    const response = await get(id, author.headers);
    expect(response.statusCode).toBe(200);
    expect(sheetOf(response.body)).toMatchObject({ status: 'private', sharedBy: null });
  });
});

describe('GET /v1/routes/:id, a Premium route (D-014, D-075)', () => {
  const premium = () => copy('published', { access: 'premium', publishedAt: new Date() });

  it('locks the steps after the start for a caller without the right to it', async () => {
    const id = await premium();
    const hidden = await app.db
      .select({ address: places.address, description: steps.description })
      .from(steps)
      .innerJoin(places, eq(places.id, steps.placeId))
      .where(and(eq(steps.routeId, id), gt(steps.position, 0)));
    for (const headers of [{}, (await account()).headers]) {
      const response = await get(id, headers);
      const sheet = sheetOf(response.body);
      expect(sheet.isLocked).toBe(true);
      expect(sheet.steps.map((step) => step.isLocked)).toEqual([false, true, true, true]);
      expect(sheet.steps.map((step) => step.transition?.geometry ?? null)).toEqual(
        sheet.steps.map(() => null),
      );
      expect(sheet.timeline.steps.slice(1).map((entry) => entry.conflicts)).toEqual([[], [], []]);
      // The route's own description may name a place: the address and advice never leave.
      for (const { address, description } of hidden) {
        expect(response.body).not.toContain(address);
        if (description) expect(response.body).not.toContain(description);
      }
    }
  });

  it.each([
    ['a Premium plan', { plan: 'premium', planExpiresAt: new Date(Date.now() + 30 * day) }],
    ['a free account that bought it alone', { plan: 'free' }],
  ] as const)('serves the whole route to %s', async (label, values) => {
    const id = await premium();
    const { headers } = await account(values);
    if (label.includes('bought')) await fixtures.unlock(headers, id);
    const sheet = sheetOf((await get(id, headers)).body);
    expect(sheet.isLocked).toBe(false);
    expect(sheet.steps.every((step) => !step.isLocked)).toBe(true);
  });

  it('locks it again for a Premium plan past its end (D-075)', async () => {
    const id = await premium();
    const { headers } = await account({
      plan: 'premium',
      planExpiresAt: new Date(Date.now() - day),
    });
    expect(sheetOf((await get(id, headers)).body).isLocked).toBe(true);
  });

  it('serves the whole of it to its author, on a free account (D-093)', async () => {
    const id = await premium();
    expect(sheetOf((await get(id, author.headers)).body).isLocked).toBe(false);
  });
});

describe('GET /v1/routes/:id, a withdrawn route', () => {
  it('answers 410 route_removed with its date and the zone of its start, nothing else', async () => {
    const removedAt = new Date('2026-09-20T08:12:00.000Z');
    const id = await copy('unpublished', { unpublishedAt: removedAt });
    const [route] = await app.db.select().from(routes).where(eq(routes.id, id));
    for (const headers of [{}, author.headers]) {
      const response = await get(`${id}?token=${linkOf(id)}`, headers);
      expect(response.statusCode).toBe(410);
      const near = {
        lat: Math.round((route?.startLocation?.lat ?? 0) * 100) / 100,
        lng: Math.round((route?.startLocation?.lng ?? 0) * 100) / 100,
      };
      expect(response.json()).toEqual({
        code: 'route_removed',
        message: 'Route removed',
        details: { removedAt: removedAt.toISOString(), near },
      });
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });
});

describe('GET /v1/routes/:id, the content of the sheet', () => {
  it('serves the exact budget of the card and the bucket of that sum, unrounded', async () => {
    const id = await copy('published');
    const [route] = await app.db.select().from(routes).where(eq(routes.id, id));
    await app.db
      .update(routes)
      .set({
        computed: { ...(route?.computed as object), budget_per_person_eur: 23 },
        budgetBucket: budgetBucketOf(23),
      })
      .where(eq(routes.id, id));
    const sheet = sheetOf((await get(id)).body);
    expect(sheet.budgetPerPersonEur).toBe(23);
    expect(sheet.budgetBucket).toBe(budgetBucketOf(23));
  });

  it('serves the zone, the tips, the credited photos, and no coherence warning', async () => {
    const id = await copy('published', { tips: ['Prévoir une gourde'] });
    // A fictitious free photo of the route, with its credit (D-052); deleted by the test.
    const url = 'https://example.com/photo-fictive.jpg';
    const credit = {
      author: 'J. Moreau',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Photo_fictive.jpg',
    };
    const [photo] = await app.db
      .insert(media)
      .values({
        ownerType: 'route',
        ownerId: id,
        storagePath: url,
        width: 1200,
        height: 800,
        source: 'commons',
        ...credit,
      })
      .returning({ id: media.id });
    try {
      const response = await get(id);
      const sheet = sheetOf(response.body);
      expect(sheet).toMatchObject({ timezone: 'Europe/Paris', tips: ['Prévoir une gourde'] });
      expect(sheet.photos).toEqual([{ url, credit }]);
      // The photo objects replace the bare URLs, without a second definition (D-093).
      expect(response.body).not.toMatch(/"photoUrls?"/);
      expect(sheet.timeline.steps.map((entry) => entry.stepId)).toEqual(
        sheet.steps.map((step) => step.id),
      );
      expect(response.body).not.toMatch(/"warnings"|"errors"/);
    } finally {
      if (photo) await app.db.delete(media).where(eq(media.id, photo.id));
    }
  });

  it('serves the running report of the caller only, null without a token (D-057)', async () => {
    const id = await copy('published');
    const reader = await account();
    const [report] = await app.db
      .insert(routeReports)
      .values({ routeId: id, userId: reader.id, reason: 'inappropriate' })
      .returning();
    expect(sheetOf((await get(id, reader.headers)).body).myReport).toEqual({
      reportedAt: report?.createdAt.toISOString(),
      status: 'open',
    });
    expect(sheetOf((await get(id)).body).myReport).toBeNull();
    expect(sheetOf((await get(id, author.headers)).body).myReport).toBeNull();
  });

  it('answers no-store without an ETag, and a public cacheable answer with trips=estimated', async () => {
    const id = await copy('published');
    const exact = await get(id);
    expect(exact.headers['cache-control']).toBe('no-store');
    expect(exact.headers.etag).toBeUndefined();
    const estimated = await get(`${id}?trips=estimated`);
    expect(estimated.statusCode).toBe(200);
    expect(estimated.headers['cache-control']).toBe('public, max-age=60');
    expect(estimated.headers.etag).toBeDefined();
    const shared = await get(`${id}?trips=estimated&token=${linkOf(id)}`);
    expect(shared.headers['cache-control']).toBe('private, no-store');
  });
});

describe('GET /v1/routes/:id, its rate limit', () => {
  it(`answers 429 rate_limited past ${ROUTE_SHEET_RATE_LIMIT} requests a minute from an IP`, async () => {
    // An app of its own: the counter is per instance.
    const limited = await buildApp(testConfig(), { tokenVerifier: verifier, directions: null });
    try {
      const url = '/v1/routes/0192f0a0-0000-7000-8000-00000000dead';
      for (let index = 0; index < ROUTE_SHEET_RATE_LIMIT; index += 1) {
        expect((await limited.inject({ url })).statusCode).toBe(404);
      }
      const over = await limited.inject({ url });
      expect(over.statusCode).toBe(429);
      expect(ApiError.parse(over.json()).code).toBe('rate_limited');
    } finally {
      await limited.close();
    }
  });
});
