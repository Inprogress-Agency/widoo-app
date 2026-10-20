import { PublicPartner } from '@widoo/shared';
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { b2bClientRoutes, b2bClients, routes } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// A partner and its routes of their own: copies of the demo route, a marker in the slug.
const verifier = new TestTokenVerifier();
const marker = `pubb2b${uuidv7().slice(-8)}`;
let slugCount = 0;

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await app.db.delete(b2bClients).where(like(b2bClients.slug, `${marker}-%`));
  await fixtures.cleanUp();
  await app.close();
});

/** A partner in `status`, with the routes given in this order. */
async function addPartner(
  status: 'prospect' | 'active' | 'suspended' | 'ended',
  routeIds: string[],
) {
  slugCount += 1;
  const [client] = await app.db
    .insert(b2bClients)
    .values({
      slug: `${marker}-${slugCount}`,
      name: `Hôtel ${marker}`,
      type: 'hotel',
      status,
      contactName: 'Camille Durand',
      contactEmail: 'camille@hotel.example',
      contactPhone: '0102030405',
      monthlyPriceCents: 4900,
      notes: 'Contrat signé le 2026-10-01',
    })
    .returning();
  if (!client) throw new Error('Partner not created');
  if (routeIds.length > 0) {
    await app.db
      .insert(b2bClientRoutes)
      .values(routeIds.map((routeId, position) => ({ clientId: client.id, routeId, position })));
  }
  return client;
}

const get = (slug: string) => app.inject({ url: `/v1/public/partners/${slug}` });

describe('GET /v1/public/partners/:slug', () => {
  it('serves an active partner and its published routes in the order it chose', async () => {
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => fixtures.copyDemoRoute()));
    if (!a || !b || !c) throw new Error('Routes not created');
    const partner = await addPartner('active', [c, a, b]);

    const response = await get(partner.slug);

    expect(response.statusCode).toBe(200);
    const page = PublicPartner.parse(response.json());
    expect(page).toMatchObject({ slug: partner.slug, name: partner.name, isActive: true });
    expect(page.routes.map((route) => route.id)).toEqual([c, a, b]);
    expect(response.headers['cache-control']).toBe('public, max-age=60');
  });

  it('keeps out of the page a route that is no longer published', async () => {
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => fixtures.copyDemoRoute()));
    if (!a || !b || !c) throw new Error('Routes not created');
    const partner = await addPartner('active', [a, b, c]);
    await app.db.update(routes).set({ status: 'unpublished' }).where(eq(routes.id, b));

    const page = PublicPartner.parse((await get(partner.slug)).json());

    expect(page.routes.map((route) => route.id)).toEqual([a, c]);
  });

  it('serves a prospect as not active, for the site to keep it out of the search engines', async () => {
    const partner = await addPartner('prospect', []);

    const response = await get(partner.slug);

    expect(response.statusCode).toBe(200);
    expect(PublicPartner.parse(response.json())).toMatchObject({ isActive: false, routes: [] });
  });

  it('answers 404 for a suspended or ended partner, and for one that does not exist', async () => {
    const suspended = await addPartner('suspended', []);
    const ended = await addPartner('ended', []);

    for (const slug of [suspended.slug, ended.slug, `${marker}-unknown`]) {
      const response = await get(slug);
      expect(response.statusCode).toBe(404);
      expect(response.headers['cache-control'] ?? '').not.toContain('public');
    }
  });

  it('never serves the contact, the price or the notes of the partner', async () => {
    const partner = await addPartner('active', []);

    const body = (await get(partner.slug)).body;

    for (const secret of ['Camille', 'camille@hotel.example', '0102030405', '4900', 'Contrat']) {
      expect(body).not.toContain(secret);
    }
    expect(Object.keys(JSON.parse(body))).toEqual(['slug', 'name', 'isActive', 'routes']);
  });
});
