/**
 * Demo data for local development and the tests: the city of Paris and the ten demo routes of
 * `seed/demo-routes.json`, with their places, authors, steps and photos. No real person appears.
 *
 * Idempotent: every row has a fixed id and fixed timestamps, so a second run leaves the database
 * identical, and an edited JSON is applied on the next run. Places, routes and authors are
 * upserted; the hours, steps and photos of the seed places and routes are rewritten.
 */
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from './client';
import { envelopeOf } from './geography';
import { cities, media, placeHours, places, routes, steps, users } from './schema';
import { bucketsOf, demoDataset, paris, type DemoPlace, type DemoRoute } from './seed/demo-routes';
import { namedUuidv7 } from './uuid';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const seedTime = Date.parse(demoDataset.datasetDate);
const seedAt = new Date(seedTime);
/** Fixed UUID v7 of a seed row, from its kind and key: `route:marais-gourmand`. */
export const seedId = (name: string) => namedUuidv7(`widoo-seed:${name}`, seedTime);

const cityId = '01997a4e-8c00-7000-8000-000000000000';
/** Rows of the first seed, fictitious places and one route, replaced by the demo dataset. */
const legacyRouteId = '01997a4e-8c00-7000-8000-000000000100';
const legacyPlaceIds = [1, 2, 3, 4].map((n) => `01997a4e-8c00-7000-8000-00000000000${n}`);

export const demoRouteIds = demoDataset.routes.map((route) => seedId(`route:${route.key}`));

export async function seed(db: Db): Promise<{ cityId: string; routeIds: string[] }> {
  return db.transaction(async (tx) => {
    const [city] = await tx
      .insert(cities)
      .values({ id: cityId, ...paris })
      .onConflictDoUpdate({ target: cities.slug, set: { isActive: true } })
      .returning({ id: cities.id });
    if (!city) throw new Error('Paris was not upserted');

    await tx.delete(routes).where(eq(routes.id, legacyRouteId));
    await tx.delete(places).where(inArray(places.id, legacyPlaceIds));

    await seedAuthors(tx);
    await seedPlaces(tx, city.id);
    await seedRoutes(tx, city.id);
    return { cityId: city.id, routeIds: demoRouteIds };
  });
}

async function seedAuthors(tx: Tx) {
  for (const { key, firstName, bio } of demoDataset.authors) {
    // A fictitious Firebase uid, which no sign-in can produce: the author cannot log in.
    const author = { firebaseUid: `seed-${key}`, firstName, bio, createdAt: seedAt };
    await tx
      .insert(users)
      .values({ id: seedId(`user:${key}`), ...author })
      .onConflictDoUpdate({ target: users.id, set: author });
  }
}

async function seedPlaces(tx: Tx, cityId: string) {
  const placeIds = demoDataset.places.map((place) => seedId(`place:${place.key}`));
  for (const place of demoDataset.places) {
    const row = placeRow(place, cityId);
    await tx
      .insert(places)
      .values({ id: seedId(`place:${place.key}`), ...row })
      .onConflictDoUpdate({ target: places.id, set: row });
  }

  await tx.delete(placeHours).where(inArray(placeHours.placeId, placeIds));
  const hours = demoDataset.places.flatMap((place) =>
    place.hours.flatMap(({ weekdays, opens, closes }, slot) =>
      weekdays.map((weekday) => ({
        id: seedId(`hours:${place.key}:${slot}:${weekday}`),
        placeId: seedId(`place:${place.key}`),
        weekday,
        opens,
        closes,
      })),
    ),
  );
  if (hours.length > 0) await tx.insert(placeHours).values(hours);
}

const placeRow = (place: DemoPlace, cityId: string) => ({
  cityId,
  name: place.name,
  category: place.category,
  location: place.location,
  address: place.address,
  addressComponents: place.addressComponents,
  isIndoor: place.isIndoor,
  priceRange: place.priceRange,
  verificationStatus: 'verified' as const,
  verifiedAt: seedAt,
  createdAt: seedAt,
  updatedAt: seedAt,
});

async function seedRoutes(tx: Tx, cityId: string) {
  for (const route of demoDataset.routes) {
    const row = routeRow(route, cityId);
    await tx
      .insert(routes)
      .values({ id: seedId(`route:${route.key}`), ...row })
      .onConflictDoUpdate({ target: routes.id, set: row });
  }

  await tx.delete(steps).where(inArray(steps.routeId, demoRouteIds));
  await tx.insert(steps).values(
    demoDataset.routes.flatMap((route) =>
      route.steps.map((step, position) => ({
        id: seedId(`step:${route.key}:${position}`),
        routeId: seedId(`route:${route.key}`),
        position,
        placeId: seedId(`place:${step.place}`),
        description: step.description,
        durationMin: step.durationMin,
        costPerPerson: step.costPerPerson,
        bookingRequired: step.bookingRequired,
        bookingUrl: step.bookingUrl ?? null,
        bookingProvider: step.bookingProvider ?? null,
        transitionNote: step.transitionNote ?? null,
      })),
    ),
  );

  // Unsplash photos are served from their URL: `storage_path` holds it until the storage bucket.
  await tx
    .delete(media)
    .where(and(eq(media.ownerType, 'route'), inArray(media.ownerId, demoRouteIds)));
  await tx.insert(media).values(
    demoDataset.routes.flatMap((route) =>
      route.photos.map(({ url, width, height }, position) => ({
        id: seedId(`media:${route.key}:${position}`),
        ownerType: 'route' as const,
        ownerId: seedId(`route:${route.key}`),
        storagePath: url,
        width,
        height,
        position,
        createdAt: seedAt,
      })),
    ),
  );
}

function routeRow(route: DemoRoute, cityId: string) {
  const locations = route.steps.map((step) => {
    const place = demoDataset.places.find((candidate) => candidate.key === step.place);
    if (!place) throw new Error(`Unknown place ${step.place}`);
    return place.location;
  });
  return {
    cityId,
    authorId: route.author === null ? null : seedId(`user:${route.author}`),
    isOfficial: route.author === null,
    status: 'published' as const,
    title: route.title,
    description: route.description,
    moods: route.moods,
    audiences: route.audiences,
    conditions: route.conditions,
    transport: route.transport,
    startLocation: locations[0],
    bounds: envelopeOf(locations),
    computed: route.computed,
    ...bucketsOf(route),
    publishedAt: seedAt,
    createdAt: seedAt,
    updatedAt: seedAt,
  };
}
