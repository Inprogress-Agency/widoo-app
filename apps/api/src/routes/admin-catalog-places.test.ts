import {
  CatalogPlaceDetail,
  CatalogPlaces,
  type CatalogPlaceInput,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, affiliatePrograms, placeHours, places, users } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users, and places found by a marker in their name.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const marker = `placetest-${uuidv7()}`;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
});
afterAll(async () => {
  const created = await app.db
    .select({ id: places.id })
    .from(places)
    .where(like(places.name, `%${marker}%`));
  const ids = created.map((place) => place.id);
  if (ids.length > 0) {
    await app.db.delete(adminActions).where(inArray(adminActions.targetId, ids));
    await app.db.delete(places).where(inArray(places.id, ids));
  }
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

// Inside the bounds of Paris of the seed.
const sheet = (name: string, changes: Partial<CatalogPlaceInput> = {}): CatalogPlaceInput => ({
  name: `${name} ${marker}`,
  category: 'cafe',
  address: '12 rue des Martyrs, 75009 Paris',
  location: { lat: 48.8785, lng: 2.3397 },
  isIndoor: true,
  priceRange: 'low',
  websiteUrl: 'https://cafe.example',
  phone: '+33 1 42 00 00 00',
  hours: [
    { weekday: 0, opens: '08:00', closes: '18:00', validFrom: null, validTo: null },
    { weekday: 1, opens: '08:00', closes: '18:00', validFrom: null, validTo: null },
  ],
  ...changes,
});

const create = (headers: Record<string, string>, payload: object) =>
  app.inject({ method: 'POST', url: '/v1/admin/places', headers, payload });
const update = (headers: Record<string, string>, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/v1/admin/places/${id}`, headers, payload });
const list = (headers: Record<string, string>, query = '') =>
  app.inject({ url: `/v1/admin/places?q=${marker}${query}`, headers });

describe('POST /v1/admin/places', () => {
  it('creates a place to verify, in the city of its position, with its hours', async () => {
    const editor = await signIn('editor');
    const response = await create(editor.headers, sheet('Création'));

    expect(response.statusCode).toBe(201);
    const place = CatalogPlaceDetail.parse(response.json());
    expect(place).toMatchObject({
      category: 'cafe',
      cityName: 'Paris',
      verificationStatus: 'stale',
      verifiedAt: null,
      routeCount: 0,
      isIndoor: true,
      phone: '+33 1 42 00 00 00',
    });
    expect(place.location.lat).toBeCloseTo(48.8785, 4);
    expect(place.hours).toEqual(sheet('').hours);

    const [journal] = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, place.id));
    expect(journal).toMatchObject({ action: 'place.create', actorId: editor.id });
  });

  // An invalid body is a 422 (wiki API › Conventions, D-071); a position no city holds is a rule
  // only the database can check, answered 400 by the route itself.
  it.each([
    ['a position outside every city', { location: { lat: 43.6, lng: 1.44 } }, 400],
    ['markup in the name', { name: '<b>Café</b>' }, 422],
    ['a link that is not https', { websiteUrl: 'http://cafe.example' }, 422],
    ['an unknown category', { category: 'casino' }, 422],
    ['a field it does not know', { verificationStatus: 'verified' }, 422],
  ])('refuses %s', async (_, changes, status) => {
    const admin = await signIn('admin');
    const response = await create(admin.headers, { ...sheet('Refus'), ...changes });
    expect(response.statusCode).toBe(status);
  });

  it('is not for a moderator, who only reads the places', async () => {
    const moderator = await signIn('moderator');
    expect((await create(moderator.headers, sheet('Lecture'))).statusCode).toBe(403);
    expect((await list(moderator.headers)).statusCode).toBe(200);
  });
});

describe('PATCH /v1/admin/places/:id', () => {
  it('replaces the sheet and its hours, and keeps both states in the journal', async () => {
    const admin = await signIn('admin');
    const created = CatalogPlaceDetail.parse((await create(admin.headers, sheet('Avant'))).json());
    const changed = sheet('Après', {
      category: 'restaurant',
      phone: null,
      hours: [{ weekday: 5, opens: '19:00', closes: '01:00', validFrom: null, validTo: null }],
    });

    const response = await update(admin.headers, created.id, changed);
    expect(response.statusCode).toBe(200);
    const place = CatalogPlaceDetail.parse(response.json());
    expect(place).toMatchObject({ name: changed.name, category: 'restaurant', phone: null });
    expect(place.hours).toEqual(changed.hours);
    const slots = await app.db.select().from(placeHours).where(eq(placeHours.placeId, created.id));
    expect(slots).toHaveLength(1);

    const journal = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, created.id));
    const updateEntry = journal.find((entry) => entry.action === 'place.update');
    expect(updateEntry?.before).toMatchObject({ category: 'cafe', phone: '+33 1 42 00 00 00' });
    expect(updateEntry?.after).toMatchObject({ category: 'restaurant', phone: null });
  });

  it('sets the partner link of Widoo with its program, and leaves it alone when not sent', async () => {
    const editor = await signIn('editor');
    const created = CatalogPlaceDetail.parse(
      (await create(editor.headers, sheet('Partenaire'))).json(),
    );
    expect(created).toMatchObject({ partnerBookingUrl: null, partnerProgramId: null });
    const [program] = await app.db
      .insert(affiliatePrograms)
      .values({ name: `${marker} programme`, network: 'Awin', cookieDays: 30 })
      .returning({ id: affiliatePrograms.id });
    if (!program) throw new Error('Program not created');
    try {
      const withLink = sheet('Partenaire', {
        partnerBookingUrl: 'https://partner.example/reserver',
        partnerProgramId: program.id,
      });
      const linked = CatalogPlaceDetail.parse(
        (await update(editor.headers, created.id, withLink)).json(),
      );
      expect(linked).toMatchObject({
        partnerBookingUrl: 'https://partner.example/reserver',
        partnerProgramId: program.id,
      });
      // A sheet without the two fields keeps them.
      const kept = CatalogPlaceDetail.parse(
        (await update(editor.headers, created.id, sheet('Partenaire', { phone: null }))).json(),
      );
      expect(kept).toMatchObject({ partnerBookingUrl: 'https://partner.example/reserver' });
      const journal = await app.db
        .select()
        .from(adminActions)
        .where(eq(adminActions.targetId, created.id));
      const setLink = journal.find(
        (entry) =>
          (entry.after as Record<string, unknown> | null)?.partnerBookingUrl ===
          'https://partner.example/reserver',
      );
      expect(setLink?.before).toMatchObject({ partnerBookingUrl: null, partnerProgramId: null });
      // Both null removes the link.
      const removed = CatalogPlaceDetail.parse(
        (
          await update(editor.headers, created.id, {
            ...withLink,
            partnerBookingUrl: null,
            partnerProgramId: null,
          })
        ).json(),
      );
      expect(removed).toMatchObject({ partnerBookingUrl: null, partnerProgramId: null });
    } finally {
      await app.db.update(places).set({ partnerProgramId: null }).where(eq(places.id, created.id));
      await app.db.delete(affiliatePrograms).where(eq(affiliatePrograms.id, program.id));
    }
  });

  it('refuses a program without a link, a link without its program field, a link that is not https and an unknown program', async () => {
    const editor = await signIn('editor');
    const created = CatalogPlaceDetail.parse((await create(editor.headers, sheet('Refus'))).json());
    const bodies = [
      sheet('Refus', { partnerBookingUrl: null, partnerProgramId: uuidv7() }),
      sheet('Refus', { partnerBookingUrl: 'https://partner.example' }),
      sheet('Refus', { partnerBookingUrl: 'http://partner.example', partnerProgramId: null }),
    ];
    for (const body of bodies) {
      expect((await update(editor.headers, created.id, body)).statusCode).toBe(422);
    }
    const unknown = sheet('Refus', {
      partnerBookingUrl: 'https://partner.example',
      partnerProgramId: uuidv7(),
    });
    expect((await update(editor.headers, created.id, unknown)).statusCode).toBe(400);
  });

  it('answers 404 for a place that does not exist', async () => {
    const admin = await signIn('admin');
    expect((await update(admin.headers, uuidv7(), sheet('Absent'))).statusCode).toBe(404);
  });
});

describe('GET /v1/admin/places', () => {
  it('searches the name and the address, filters and sorts', async () => {
    const admin = await signIn('admin');
    await create(admin.headers, sheet('Zèbre', { category: 'park' }));

    const all = CatalogPlaces.parse((await list(admin.headers)).json());
    expect(all.total).toBeGreaterThanOrEqual(2);
    const names = all.items.map((place) => place.name.split(' ')[0] ?? '');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')));

    const parks = CatalogPlaces.parse((await list(admin.headers, '&category=park')).json());
    expect(parks.items.map((place) => place.name.split(' ')[0])).toEqual(['Zèbre']);
    const verified = CatalogPlaces.parse((await list(admin.headers, '&status=verified')).json());
    expect(verified.items).toEqual([]);
  });

  it('counts the routes that go through a place of the seed', async () => {
    const admin = await signIn('admin');
    const response = await app.inject({
      url: '/v1/admin/places?sort=routes&direction=desc',
      headers: admin.headers,
    });
    const [most] = CatalogPlaces.parse(response.json()).items;
    expect(most?.routeCount).toBeGreaterThanOrEqual(1);

    const detail = await app.inject({
      url: `/v1/admin/places/${most?.id}`,
      headers: admin.headers,
    });
    expect(CatalogPlaceDetail.parse(detail.json()).routes.length).toBe(most?.routeCount);
  });
});
