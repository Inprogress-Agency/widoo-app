import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { media, places, routes, steps } from './schema';
import { uuidv7 } from './uuid';

// Migration 0013 (#176: D-048, D-049, D-050), on a copy of a demo route and a fictitious place,
// both deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());
let routeId: string;
let stepId: string;
const placeId = uuidv7();

beforeAll(async () => {
  app = await buildApp(testConfig());
  routeId = await fixtures.copyDemoRoute();
  const [first] = await app.db
    .select({ id: steps.id, placeId: steps.placeId })
    .from(steps)
    .where(eq(steps.routeId, routeId))
    .orderBy(asc(steps.position))
    .limit(1);
  if (!first) throw new Error('The copied route has no step');
  stepId = first.id;
  const [demoPlace] = await app.db
    .select({ cityId: places.cityId })
    .from(places)
    .where(eq(places.id, first.placeId));
  if (!demoPlace) throw new Error('The demo place is missing');
  await app.db.insert(places).values({
    id: placeId,
    cityId: demoPlace.cityId,
    name: 'Lieu fictif éphémère',
    category: 'event_venue',
    location: { lat: -40, lng: -40 },
    address: 'Adresse fictive',
    verificationStatus: 'unverified',
  });
});
afterAll(async () => {
  await app.db.delete(media).where(eq(media.ownerId, placeId));
  await app.db.delete(places).where(eq(places.id, placeId));
  await fixtures.cleanUp();
  await app.close();
});

const setRoute = (values: Partial<typeof routes.$inferInsert>) =>
  app.db.update(routes).set(values).where(eq(routes.id, routeId));
const setStep = (values: Partial<typeof steps.$inferInsert>) =>
  app.db.update(steps).set(values).where(eq(steps.id, stepId));

describe('routes', () => {
  it('store the suggested start, the tips and the hidden suggestions', async () => {
    await setRoute({
      suggestedStart: '10:30',
      tips: ['Des espèces', 'Une gourde', 'Un pique-nique'],
      tipsHidden: ['comfy_shoes'],
    });
    const [after] = await app.db.select().from(routes).where(eq(routes.id, routeId));
    expect(after).toMatchObject({ suggestedStart: '10:30:00', tipsHidden: ['comfy_shoes'] });
  });

  it.each([
    ['a fourth tip', { tips: ['Un', 'Deux', 'Trois', 'Quatre'] }],
    ['an empty tip', { tips: ['Des espèces', ''] }],
    ['an empty hidden key', { tipsHidden: [''] }],
    ['a title over 60 characters', { title: 'x'.repeat(61) }],
  ])('refuse %s', async (_, values) => {
    await expect(setRoute(values)).rejects.toThrow();
  });
});

describe('steps', () => {
  it('store the booking note, the affiliate link and the last day', async () => {
    await setStep({
      bookingUrl: 'https://example.com/reserver',
      bookingNote: 'Le soir, la terrasse',
      bookingIsAffiliate: true,
      endsOn: '2027-01-17',
    });
    const [step] = await app.db.select().from(steps).where(eq(steps.id, stepId));
    expect(step).toMatchObject({ bookingIsAffiliate: true, endsOn: '2027-01-17' });
  });

  it.each([
    ['an affiliate link without a link', { bookingUrl: null, bookingIsAffiliate: true }],
    ['a booking note over 80 characters', { bookingNote: 'x'.repeat(81) }],
    ['a word over 600 characters', { description: 'x'.repeat(601) }],
  ])('refuse %s', async (_, values) => {
    await expect(setStep(values)).rejects.toThrow();
  });
});

describe('places', () => {
  it('take the unverified status, always open and the last day of an ephemeral place', async () => {
    const [created] = await app.db.select().from(places).where(eq(places.id, placeId));
    expect(created).toMatchObject({
      verificationStatus: 'unverified',
      alwaysOpen: false,
      endsOn: null,
    });
    await app.db
      .update(places)
      .set({ alwaysOpen: true, endsOn: '2027-01-17' })
      .where(eq(places.id, placeId));
  });
});

describe('media', () => {
  const photo = (values: Partial<typeof media.$inferInsert>) =>
    app.db.insert(media).values({
      ownerType: 'place',
      ownerId: placeId,
      storagePath: `test/places/${placeId}/${uuidv7()}.jpg`,
      width: 1200,
      height: 800,
      ...values,
    });
  const credit = {
    source: 'commons' as const,
    author: 'J. Moreau',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Exemple.jpg',
  };

  it('are uploads without credit by default, or free photos with their full credit', async () => {
    await photo({});
    await photo(credit);
    const rows = await app.db.select().from(media).where(eq(media.ownerId, placeId));
    expect(rows.map((row) => row.source).sort()).toEqual(['commons', 'upload']);
  });

  it.each([
    ['a free photo without author', { ...credit, author: null }],
    ['a free photo without licence', { ...credit, license: '' }],
    ['a free photo with an http source', { ...credit, sourceUrl: 'http://example.com/a.jpg' }],
    ['a credit on an upload', { author: 'J. Moreau' }],
  ])('refuse %s', async (_, values) => {
    await expect(photo(values)).rejects.toThrow();
  });
});
