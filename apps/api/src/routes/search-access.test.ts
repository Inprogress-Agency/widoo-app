import { ApiError, RouteCount, RouteSearchResult, type RouteCard } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes, steps, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// The search with an optional token (D-075): a Premium copy of a demo route, same places and
// steps, on a zone of its own far from Paris and from the other test files, and one account per
// plan. Everything is deleted afterwards; the demo route is left untouched.
const verifier = new TestTokenVerifier();
const premiumId = uuidv7();
const premiumZone = 'bbox=20.99,20.99,21.01,21.01';
const marais = 'bbox=2.355,48.85,2.37,48.865&moods[]=food';
const demoId = seedId('route:marais-gourmand');
const day = 24 * 60 * 60 * 1000;
const accounts = {
  free: { plan: 'free', planExpiresAt: null },
  premium: { plan: 'premium', planExpiresAt: new Date(Date.now() + 30 * day) },
  expired: { plan: 'premium', planExpiresAt: new Date(Date.now() - day) },
} as const;
const tokens = new Map<keyof typeof accounts, string>();
const uids: string[] = [];

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  for (const key of Object.keys(accounts) as (keyof typeof accounts)[]) {
    const { token, uid } = verifier.issue();
    tokens.set(key, token);
    uids.push(uid);
    await app.db.insert(users).values({ firebaseUid: uid, ...accounts[key] });
  }
  const [demoRoute] = await app.db.select().from(routes).where(eq(routes.id, demoId));
  if (!demoRoute) throw new Error('Demo route missing from the seed');
  await app.db.insert(routes).values({
    ...demoRoute,
    id: premiumId,
    access: 'premium',
    startLocation: { lat: 21, lng: 21 },
    bounds: { west: 21, south: 21, east: 21.001, north: 21.001 },
  });
  const demoSteps = await app.db.select().from(steps).where(eq(steps.routeId, demoId));
  await app.db
    .insert(steps)
    .values(demoSteps.map((step) => ({ ...step, id: uuidv7(), routeId: premiumId })));
});
afterAll(async () => {
  await app.db.delete(routes).where(eq(routes.id, premiumId));
  await app.db.delete(users).where(inArray(users.firebaseUid, uids));
  await app.close();
});

const bearer = (account: keyof typeof accounts) => ({
  authorization: `Bearer ${tokens.get(account)}`,
});
const get = (url: string, headers: Record<string, string> = {}) =>
  app.inject({ url: `/v1/routes/search${url}`, headers });
const cardsOf = (body: string) => RouteSearchResult.parse(JSON.parse(body)).items;
/** The demo route, free: the steps the Premium copy holds. */
const demoCard = async (): Promise<RouteCard> => {
  const card = cardsOf((await get(`?${marais}`)).body).find((item) => item.id === demoId);
  if (!card) throw new Error('Demo route missing from the search');
  return card;
};

/** A locked card: its start alone, unnamed; nothing of the steps after it in the raw JSON. */
async function expectLocked(body: string) {
  const demo = await demoCard();
  const [card] = cardsOf(body);
  expect(card).toMatchObject({ id: premiumId, access: 'premium', isLocked: true, stepCount: 4 });
  expect(card?.steps).toEqual([{ ...demo.steps[0], name: null, durationMin: null }]);
  const hidden = demo.steps.slice(1);
  for (const step of hidden) {
    expect(body).not.toContain(String(step.location.lat));
    expect(body).not.toContain(String(step.location.lng));
    expect(body).not.toContain(String(step.name));
    if (step.category !== demo.steps[0]?.category) expect(body).not.toContain(step.category);
  }
}

describe('GET /v1/routes/search with an optional token (D-075)', () => {
  it('locks a Premium card without a token, in a public answer that varies on the token', async () => {
    const response = await get(`?${premiumZone}`);
    expect(response.statusCode).toBe(200);
    await expectLocked(response.body);
    expect(response.headers['cache-control']).toBe('public, max-age=30');
    expect(response.headers.etag).toMatch(/^"[\w-]+"$/);
    expect(response.headers.vary).toContain('Authorization');
  });

  it.each([
    ['a free account', 'free'],
    ['a Premium plan past its end', 'expired'],
  ] as const)('locks a Premium card for %s, in a private answer', async (_, account) => {
    const response = await get(`?${premiumZone}`, bearer(account));
    expect(response.statusCode).toBe(200);
    await expectLocked(response.body);
    expect(response.headers['cache-control']).toBe('private, no-cache');
    expect(response.headers.vary).toContain('Authorization');
  });

  it('carries every step of a Premium card for a Premium plan, as the free route', async () => {
    const response = await get(`?${premiumZone}`, bearer('premium'));
    expect(response.statusCode).toBe(200);
    const [card] = cardsOf(response.body);
    expect(card).toMatchObject({ access: 'premium', isLocked: false, stepCount: 4 });
    expect(card?.steps).toEqual((await demoCard()).steps);
    expect(response.headers['cache-control']).toBe('private, no-cache');
    expect(response.headers.vary).toContain('Authorization');
  });

  it('never answers 304 to the ETag of another caller', async () => {
    const anonymous = await get(`?${premiumZone}`);
    const unlocked = await get(`?${premiumZone}`, {
      ...bearer('premium'),
      'if-none-match': String(anonymous.headers.etag),
    });
    expect(unlocked.statusCode).toBe(200);
    expect(unlocked.headers.etag).not.toBe(anonymous.headers.etag);
    expect(cardsOf(unlocked.body)[0]?.isLocked).toBe(false);
  });

  it.each([
    ['a token the verifier refuses', { authorization: 'Bearer fictitious-token' }],
    ['another scheme', { authorization: 'Basic ZmljdGl0aW91cw==' }],
  ])('answers 401 unauthorized to %s, never the anonymous answer', async (_, headers) => {
    const response = await get(`?${premiumZone}`, headers);
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
    expect(response.headers['cache-control'] ?? '').not.toContain('public');
    expect(response.body).not.toContain(premiumId);
  });

  it('leaves a free card unchanged for any caller', async () => {
    const anonymous = await demoCard();
    for (const account of ['free', 'premium'] as const) {
      const card = cardsOf((await get(`?${marais}`, bearer(account))).body).find(
        (item) => item.id === demoId,
      );
      expect(card).toEqual({ ...anonymous, isLocked: false });
    }
  });

  it('counts the same routes whatever the caller, in a public answer', async () => {
    const anonymous = await get(`/count?${premiumZone}`);
    const withToken = await get(`/count?${premiumZone}`, bearer('premium'));
    expect(RouteCount.parse(anonymous.json())).toEqual({ count: 1 });
    expect(withToken.json()).toEqual(anonymous.json());
    expect(withToken.headers['cache-control']).toBe('public, max-age=30');
  });
});
