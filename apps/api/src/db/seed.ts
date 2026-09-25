/**
 * Demo data for local development and staging: the city of Paris, invented places in the Marais
 * and one official route through them. Names and addresses are fictitious; no person appears.
 * Idempotent: fixed ids, and a second run inserts nothing.
 */
import type { LatLng } from '@widoo/shared';
import type { Db } from './client';
import { envelopeOf } from './geography';
import { cities, placeHours, places, routes, steps } from './schema';
import { paris } from './seed/demo-routes';

type NewPlace = Omit<typeof places.$inferInsert, 'cityId' | 'verificationStatus'> & { id: string };
type NewHours = Omit<typeof placeHours.$inferInsert, 'placeId'>;
type NewStep = Omit<typeof steps.$inferInsert, 'routeId' | 'placeId' | 'position'>;

/** Fixed UUID v7 of the seed rows. */
const seedId = (n: number) => `01997a4e-8c00-7000-8000-${String(n).padStart(12, '0')}`;
export const seedRouteId = seedId(100);

/** Weekdays, 0 = Monday. */
const allWeek = [0, 1, 2, 3, 4, 5, 6];
const mondayToSaturday = [0, 1, 2, 3, 4, 5];
const tuesdayToSunday = [1, 2, 3, 4, 5, 6];
const openOn = (weekdays: number[], opens: string, closes: string): NewHours[] =>
  weekdays.map((weekday) => ({ weekday, opens, closes }));

/** One place per step of the seed route, in order, with its hours (none for the square: unknown). */
const seedPlaces: { place: NewPlace; hours: NewHours[]; step: NewStep }[] = [
  {
    place: {
      id: seedId(1),
      name: 'Café de l’Essai',
      category: 'cafe',
      location: { lat: 48.8575, lng: 2.3615 },
      address: '1 rue Imaginaire, 75004 Paris',
      isIndoor: true,
      priceRange: 'low',
    },
    hours: openOn(allWeek, '08:00', '19:00'),
    step: { durationMin: 30, costPerPerson: 6, description: 'Un café en terrasse pour commencer.' },
  },
  {
    place: {
      id: seedId(2),
      name: 'Galerie Prototype',
      category: 'gallery',
      location: { lat: 48.8601, lng: 2.364 },
      address: '12 rue Fictive, 75003 Paris',
      isIndoor: true,
      priceRange: 'free',
    },
    hours: openOn(tuesdayToSunday, '11:00', '19:00'),
    step: { durationMin: 60, costPerPerson: 0, description: 'Exposition du moment, entrée libre.' },
  },
  {
    place: {
      id: seedId(3),
      name: 'Square du Brouillon',
      category: 'park',
      location: { lat: 48.8589, lng: 2.366 },
      address: 'place Inventée, 75003 Paris',
      priceRange: 'free',
    },
    hours: [],
    step: { durationMin: 30, costPerPerson: 0, description: 'Pause au calme sur un banc.' },
  },
  {
    place: {
      id: seedId(4),
      name: 'Bistrot Exemple',
      category: 'restaurant',
      location: { lat: 48.8548, lng: 2.3628 },
      address: '7 rue de la Démo, 75004 Paris',
      isIndoor: true,
      priceRange: 'medium',
    },
    // Split hours: lunch and dinner, closed on Sunday.
    hours: [
      ...openOn(mondayToSaturday, '12:00', '14:30'),
      ...openOn(mondayToSaturday, '19:00', '23:00'),
    ],
    step: { durationMin: 90, costPerPerson: 35, description: 'Dîner de cuisine de saison.' },
  },
];

export async function seed(db: Db): Promise<{ cityId: string; routeId: string }> {
  return db.transaction(async (tx) => {
    const [city] = await tx
      .insert(cities)
      .values({ id: seedId(0), ...paris })
      .onConflictDoUpdate({ target: cities.slug, set: { isActive: true } })
      .returning({ id: cities.id });
    if (!city) throw new Error('Paris was not upserted');

    for (const { place, hours } of seedPlaces) {
      const inserted = await tx
        .insert(places)
        .values({
          ...place,
          cityId: city.id,
          verificationStatus: 'verified',
          verifiedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: places.id });
      if (inserted.length > 0 && hours.length > 0) {
        await tx.insert(placeHours).values(hours.map((slot) => ({ ...slot, placeId: place.id })));
      }
    }

    const locations: LatLng[] = seedPlaces.map(({ place }) => place.location);
    const route = await tx
      .insert(routes)
      .values({
        id: seedRouteId,
        cityId: city.id,
        isOfficial: true,
        status: 'published',
        title: 'Flânerie d’essai dans le Marais',
        description: 'Parcours fictif de démonstration : café, galerie, square puis dîner.',
        moods: ['culture', 'food'],
        audiences: ['couple', 'friends'],
        conditions: ['no_booking'],
        transport: 'walk',
        startLocation: locations[0],
        bounds: envelopeOf(locations),
        durationBucket: 'half_day',
        budgetBucket: 'medium',
        publishedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: routes.id });
    if (route.length > 0) {
      await tx.insert(steps).values(
        seedPlaces.map(({ place, step }, position) => ({
          ...step,
          routeId: seedRouteId,
          position,
          placeId: place.id,
        })),
      );
    }
    return { cityId: city.id, routeId: seedRouteId };
  });
}
