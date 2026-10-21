import { ApiError, Place, PlaceSearchResult } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { places } from '../db/schema';
import { demoPlaceIds, editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';

let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = editorFixtures(() => app, verifier);
const createdPlaceIds: string[] = [];

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
  if (createdPlaceIds.length > 0) {
    await app.db.delete(places).where(inArray(places.id, createdPlaceIds));
  }
  await app.close();
});

type Headers = Record<string, string>;

/** Rue de Sévigné, a few metres from the Musée Carnavalet of the demo. */
const near = { lat: 48.85732, lng: 2.36247 };
/** A corner of Saint-Germain-des-Prés without any place of the demo. */
const flore = { lat: 48.8541, lng: 2.3327 };
/** A new spot of Paris at each call, over 100 m from the last: two places never look alike by position. */
let spots = 0;
const spot = () => ({ lat: 48.82 + (spots += 1) * 0.0012, lng: 2.3 });

/** About 20 m north of `flore` (0.00018° of latitude). */
const floreNeighbour = { lat: 48.85428, lng: 2.3327 };

const search = (headers: Headers, query: string) =>
  app.inject({ url: `/v1/places/search?${query}`, headers });
const create = (headers: Headers, payload: object) =>
  app.inject({ method: 'POST', url: '/v1/places', headers, payload });
const edit = (headers: Headers, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/places/${id}`, headers, payload });

/** A valid body; each test names its own place, as the database is shared. */
const body = (name: string, location = spot(), extra: object = {}) => ({
  name,
  category: 'cafe',
  location,
  address: '172 boulevard Saint-Germain, 75006 Paris',
  ...extra,
});

async function createdBy(headers: Headers, name: string, location = spot(), extra: object = {}) {
  const response = await create(headers, body(name, location, extra));
  expect(response.statusCode).toBe(201);
  const place = Place.parse(response.json());
  createdPlaceIds.push(place.id);
  return place;
}

describe('GET /places/search', () => {
  it('finds a place by a piece of its name, the nearest first, with its distance', async () => {
    const headers = await fixtures.signIn();
    const response = await search(headers, `q=carnavalet&near=${near.lat},${near.lng}`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const { items } = PlaceSearchResult.parse(response.json());
    expect(items[0]).toMatchObject({ id: demoPlaceIds[1], name: 'Musée Carnavalet' });
    expect(items[0]?.distanceM).toBeLessThan(50);
  });

  it('answers a position alone with the nearest places, a text alone without distance', async () => {
    const headers = await fixtures.signIn();
    const byPosition = PlaceSearchResult.parse(
      (await search(headers, `near=${near.lat},${near.lng}&limit=3`)).json(),
    );
    expect(byPosition.items).toHaveLength(3);
    const distances = byPosition.items.map((item) => item.distanceM ?? Infinity);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    const byText = PlaceSearchResult.parse((await search(headers, 'q=carnavalet')).json());
    expect(byText.items[0]?.distanceM).toBeNull();
  });

  it('filters by category', async () => {
    const headers = await fixtures.signIn();
    const { items } = PlaceSearchResult.parse(
      (await search(headers, 'q=carnavalet&category=museum')).json(),
    );
    expect(items.map((item) => item.id)).toContain(demoPlaceIds[1]);
    const none = PlaceSearchResult.parse(
      (await search(headers, 'q=carnavalet&category=bakery')).json(),
    );
    expect(none.items).toEqual([]);
  });

  it('takes % and _ of the text as letters', async () => {
    const headers = await fixtures.signIn();
    const { items } = PlaceSearchResult.parse((await search(headers, 'q=%25%25')).json());
    expect(items).toEqual([]);
  });

  it('does not offer a closed place', async () => {
    const headers = await fixtures.signIn();
    const place = await createdBy(headers, 'Fermé pour toujours ouistiti');
    await app.db
      .update(places)
      .set({ verificationStatus: 'closed' })
      .where(eq(places.id, place.id));
    const { items } = PlaceSearchResult.parse((await search(headers, 'q=ouistiti')).json());
    expect(items).toEqual([]);
  });

  it('refuses a search without text nor position, and an unknown key', async () => {
    const headers = await fixtures.signIn();
    expect((await search(headers, 'category=cafe')).statusCode).toBe(400);
    expect((await search(headers, 'q=ca&near=48,2&city=paris')).statusCode).toBe(400);
  });

  it('refuses an anonymous caller', async () => {
    expect((await search({}, 'q=carnavalet')).statusCode).toBe(401);
  });
});

describe('POST /places', () => {
  it('creates an unverified place of the city that holds it, with its hours', async () => {
    const headers = await fixtures.signIn();
    const place = await createdBy(headers, 'Chez Ouistiti Une', flore, {
      priceRange: 'low',
      hours: [{ weekday: 0, opens: '08:00', closes: '18:00', validFrom: null, validTo: null }],
    });
    expect(place).toMatchObject({
      name: 'Chez Ouistiti Une',
      category: 'cafe',
      location: flore,
      verificationStatus: 'unverified',
      verifiedAt: null,
      isIndoor: false,
      hours: [{ weekday: 0, opens: '08:00', closes: '18:00' }],
    });
    const found = PlaceSearchResult.parse((await search(headers, 'q=ouistiti+une')).json());
    expect(found.items.map((item) => item.id)).toEqual([place.id]);
  });

  it('offers the close place of a close name instead, unless the creator insists', async () => {
    const headers = await fixtures.signIn();
    const existing = await createdBy(headers, 'Café de Flore Doublon', flore);
    const refused = await create(headers, body('Cafe de Flore Doublon', floreNeighbour));
    expect(refused.statusCode).toBe(409);
    const error = ApiError.parse(refused.json());
    expect(error.code).toBe('conflict');
    expect(error.details).toMatchObject({
      reason: 'similar_place',
      candidate: { id: existing.id, name: 'Café de Flore Doublon' },
    });
    const forced = await create(
      headers,
      body('Cafe de Flore Doublon', floreNeighbour, { force: true }),
    );
    expect(forced.statusCode).toBe(201);
    createdPlaceIds.push(Place.parse(forced.json()).id);
  });

  it('does not take a far place or another name for a duplicate', async () => {
    const headers = await fixtures.signIn();
    await createdBy(headers, 'Salon Zéphyr Quatre', flore);
    const far = { lat: 48.8548, lng: 2.3327 };
    for (const [name, location] of [
      ['Salon Zéphyr Quatre', far],
      ['Boulangerie Totalement Autre', floreNeighbour],
    ] as const) {
      const response = await create(headers, body(name, location));
      expect(response.statusCode).toBe(201);
      createdPlaceIds.push(Place.parse(response.json()).id);
    }
  });

  it('refuses a position that no city holds', async () => {
    const headers = await fixtures.signIn();
    const response = await create(headers, body('Café du Bout du Monde', { lat: 0, lng: 0 }));
    expect(response.statusCode).toBe(422);
    expect(ApiError.parse(response.json()).details).toMatchObject({
      issues: [{ location: 'body', path: 'location', code: 'outside_service_area' }],
    });
  });

  it('stops at 20 places a day, and counts only the places of the account', async () => {
    const headers = await fixtures.signIn();
    const owner = await fixtures.signIn();
    for (let n = 1; n <= 20; n += 1) {
      const response = await create(
        owner,
        body(`Lieu Quota ${String(n).padStart(2, '0')} ${'xyz'.repeat(n)}`, {
          lat: 48.85 + n * 0.001,
          lng: 2.3,
        }),
      );
      expect(response.statusCode).toBe(201);
      createdPlaceIds.push(Place.parse(response.json()).id);
    }
    const over = await create(owner, body('Le Vingt-et-unième Lieu', { lat: 48.88, lng: 2.4 }));
    expect(over.statusCode).toBe(429);
    expect(ApiError.parse(over.json())).toMatchObject({
      code: 'rate_limited',
      details: { reason: 'place_creation', limit: 20 },
    });
    const other = await create(headers, body('Lieu Quota Autre Compte', { lat: 48.88, lng: 2.41 }));
    expect(other.statusCode).toBe(201);
    createdPlaceIds.push(Place.parse(other.json()).id);
  });

  it('refuses a body that breaks a rule, markup, a link that is not https, an unknown key', async () => {
    const headers = await fixtures.signIn();
    for (const extra of [
      { name: '<b>Gras</b>' },
      { websiteUrl: 'http://exemple.fr' },
      { surprise: true },
      { category: 'spa' },
    ]) {
      const response = await create(headers, { ...body('Café Invalide'), ...extra });
      expect(response.statusCode).toBe(422);
    }
  });

  it('refuses an anonymous caller', async () => {
    expect((await create({}, body('Café Anonyme'))).statusCode).toBe(401);
  });
});

describe('PATCH /places/:id', () => {
  it('lets the creator edit their place, hours replaced as a whole', async () => {
    const headers = await fixtures.signIn();
    const place = await createdBy(headers, 'Chez Ouistiti Deux', spot(), {
      hours: [{ weekday: 0, opens: '08:00', closes: '18:00', validFrom: null, validTo: null }],
    });
    const response = await edit(headers, place.id, {
      phone: '+33 1 23 45 67 89',
      priceRange: 'medium',
      hours: [{ weekday: 2, opens: '09:00', closes: '12:00', validFrom: null, validTo: null }],
    });
    expect(response.statusCode).toBe(200);
    expect(Place.parse(response.json())).toMatchObject({
      name: 'Chez Ouistiti Deux',
      hours: [{ weekday: 2, opens: '09:00', closes: '12:00' }],
    });
  });

  it("refuses another user, and the creator once another author's route uses the place", async () => {
    const creator = await fixtures.signIn();
    const stranger = await fixtures.signIn();
    const place = await createdBy(creator, 'Chez Ouistiti Trois');
    expect((await edit(stranger, place.id, { phone: '0102030405' })).statusCode).toBe(403);

    const route = await app.inject({
      method: 'POST',
      url: '/v1/routes',
      headers: stranger,
      payload: { title: 'Un parcours qui passe par là' },
    });
    const put = await app.inject({
      method: 'PUT',
      url: `/v1/routes/${route.json<{ id: string }>().id}/steps`,
      headers: stranger,
      payload: { steps: [{ placeId: place.id, durationMin: 30 }] },
    });
    expect(put.statusCode).toBe(200);
    expect((await edit(creator, place.id, { phone: '0102030405' })).statusCode).toBe(403);
  });

  it('lets a moderator edit any place', async () => {
    const creator = await fixtures.signIn();
    const moderator = await fixtures.signIn('moderator');
    const place = await createdBy(creator, 'Chez Ouistiti Quatre');
    const response = await edit(moderator, place.id, { category: 'bar' });
    expect(response.statusCode).toBe(200);
    expect(Place.parse(response.json()).category).toBe('bar');
  });

  it('refuses a new position that no city holds, an empty body, an unknown place', async () => {
    const headers = await fixtures.signIn();
    const place = await createdBy(headers, 'Chez Ouistiti Cinq');
    expect((await edit(headers, place.id, { location: { lat: 0, lng: 0 } })).statusCode).toBe(422);
    expect((await edit(headers, place.id, {})).statusCode).toBe(422);
    const missing = await edit(headers, '01997a4e-8c00-7000-8000-0000000000ff', {
      phone: '0102030405',
    });
    expect(missing.statusCode).toBe(404);
  });
});
