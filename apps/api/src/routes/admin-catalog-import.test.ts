import { PlaceImportResult, type CatalogPlaceInput, type UserRole } from '@widoo/shared';
import { and, eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, places, users } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique users, and places found by a marker in their name.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const marker = `importtest-${uuidv7()}`;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
});

const createdPlaces = () =>
  app.db
    .select({ id: places.id, name: places.name })
    .from(places)
    .where(like(places.name, `%${marker}%`));

afterAll(async () => {
  const ids = (await createdPlaces()).map((place) => place.id);
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
const paris = { lat: 48.8785, lng: 2.3397 };
const place = (name: string, changes: Partial<CatalogPlaceInput> = {}): CatalogPlaceInput => ({
  name: `${name} ${marker}`,
  category: 'cafe',
  address: '12 rue des Martyrs, 75009 Paris',
  location: paris,
  isIndoor: true,
  priceRange: null,
  websiteUrl: null,
  phone: null,
  hours: [],
  ...changes,
});

async function importRows(headers: Record<string, string>, rowPlaces: unknown[], dryRun = false) {
  const rows = rowPlaces.map((rowPlace, index) => ({ line: index + 2, place: rowPlace }));
  return app.inject({
    method: 'POST',
    url: '/v1/admin/places/import',
    headers,
    payload: { dryRun, rows },
  });
}

describe('POST /v1/admin/places/import', () => {
  it('creates 48 places out of 50 rows and explains the 2 invalid ones', async () => {
    const admin = await signIn('admin');
    const rows: unknown[] = Array.from({ length: 50 }, (_, index) => place(`Lot ${index}`));
    rows[9] = { ...place('Lot 9'), category: 'spaceport' };
    rows[30] = { ...place('Lot 30'), name: '', location: { lat: 120, lng: 2 } };

    const response = await importRows(admin.headers, rows);

    expect(response.statusCode).toBe(200);
    const result = PlaceImportResult.parse(response.json());
    expect(result.counts).toMatchObject({ created: 48, invalid: 2, duplicate: 0, outside: 0 });
    expect(result.rows.filter((row) => row.outcome === 'invalid')).toEqual([
      { line: 11, outcome: 'invalid', fields: ['category'], duplicateOf: null },
      { line: 32, outcome: 'invalid', fields: ['name', 'location'], duplicateOf: null },
    ]);

    const created = (await createdPlaces()).filter((row) => row.name.startsWith('Lot '));
    expect(created).toHaveLength(48);
    const journal = await app.db
      .select({ id: adminActions.id })
      .from(adminActions)
      .where(and(eq(adminActions.actorId, admin.id), eq(adminActions.action, 'place.import')));
    expect(journal).toHaveLength(48);
  });

  it('previews without creating anything', async () => {
    const admin = await signIn('admin');

    const response = await importRows(admin.headers, [place('Aperçu')], true);

    const result = PlaceImportResult.parse(response.json());
    expect(result.rows).toEqual([{ line: 2, outcome: 'ready', fields: [], duplicateOf: null }]);
    expect((await createdPlaces()).some((row) => row.name.startsWith('Aperçu'))).toBe(false);
  });

  it('flags a place of the same name within 50 m, in the catalog or earlier in the file', async () => {
    const admin = await signIn('admin');
    await importRows(admin.headers, [place('Doublon')]);
    const near = { lat: paris.lat + 0.0002, lng: paris.lng };
    const far = { lat: paris.lat + 0.002, lng: paris.lng };

    const response = await importRows(admin.headers, [
      place('doublon', { location: near }),
      place('Doublon', { location: far }),
      place('Jumeau'),
      place('Jumeau', { location: near }),
    ]);

    const result = PlaceImportResult.parse(response.json());
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'duplicate',
      'created',
      'created',
      'duplicate',
    ]);
    expect(result.rows[0]?.duplicateOf).toMatchObject({ name: `Doublon ${marker}`, line: null });
    expect(result.rows[0]?.duplicateOf?.placeId).toEqual(expect.any(String));
    expect(result.rows[3]?.duplicateOf).toEqual({
      name: `Jumeau ${marker}`,
      placeId: null,
      line: 4,
    });
  });

  it('skips a place outside every city', async () => {
    const admin = await signIn('admin');

    const response = await importRows(admin.headers, [
      place('Ailleurs', { location: { lat: 32.5, lng: 32.5 } }),
    ]);

    expect(PlaceImportResult.parse(response.json()).counts).toMatchObject({ outside: 1 });
  });

  it('is refused to an editor', async () => {
    const editor = await signIn('editor');

    const response = await importRows(editor.headers, [place('Refusé')], true);

    expect(response.statusCode).toBe(403);
  });
});
