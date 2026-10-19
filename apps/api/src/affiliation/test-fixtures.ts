import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { affiliatePrograms, bookingClicks, places, routes, steps } from '../db/schema';
import { seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';

const templateRouteId = seedId('route:marais-gourmand');
const farAway = { lat: 33, lng: 33 };
const farAwayBounds = { west: 33, south: 33, east: 33.001, north: 33.001 };

export type StepSetup = {
  creatorUrl?: string;
  isAffiliate?: boolean;
  bookingRequired?: boolean;
  partnerUrl?: string;
  /** Gives the partner link a program of its own, active or not. */
  programIsActive?: boolean;
  routeStatus?: 'published' | 'draft';
};

/**
 * Steps for the tests of the booking links: each one on a route and a place of its own, copied
 * from the seed far from every zone the other tests look at. The database is shared by the test
 * files that run in parallel, so everything created here is deleted by `cleanUp`.
 */
export function createStepFixtures(db: Db) {
  const placeIds: string[] = [];
  const routeIds: string[] = [];
  const programIds: string[] = [];
  const stepIds: string[] = [];

  async function addPlace(
    setup: { partnerUrl?: string; partnerProgramId?: string | null } = {},
  ): Promise<string> {
    const [stepTemplate] = await db
      .select()
      .from(steps)
      .where(eq(steps.routeId, templateRouteId))
      .limit(1);
    if (!stepTemplate) throw new Error('Demo route missing from the seed');
    const [placeTemplate] = await db
      .select()
      .from(places)
      .where(eq(places.id, stepTemplate.placeId));
    if (!placeTemplate) throw new Error('Demo place missing from the seed');
    const placeId = uuidv7();
    placeIds.push(placeId);
    await db.insert(places).values({
      ...placeTemplate,
      id: placeId,
      name: `Lieu ${placeId}`,
      location: farAway,
      partnerBookingUrl: setup.partnerUrl ?? null,
      partnerProgramId: setup.partnerProgramId ?? null,
    });
    return placeId;
  }

  return {
    /** A place of its own, far from the seed, for the tests that change a place. */
    addPlace,

    async addStep(setup: StepSetup = {}): Promise<string> {
      const [routeTemplate] = await db.select().from(routes).where(eq(routes.id, templateRouteId));
      const [stepTemplate] = await db
        .select()
        .from(steps)
        .where(eq(steps.routeId, templateRouteId))
        .limit(1);
      if (!routeTemplate || !stepTemplate) throw new Error('Demo route missing from the seed');
      let programId: string | null = null;
      if (setup.partnerUrl && setup.programIsActive !== undefined) {
        programId = uuidv7();
        programIds.push(programId);
        await db.insert(affiliatePrograms).values({
          id: programId,
          name: `fixture-${programId}`,
          network: 'Awin',
          cookieDays: 30,
          isActive: setup.programIsActive,
        });
      }
      const placeId = await addPlace({ partnerUrl: setup.partnerUrl, partnerProgramId: programId });
      const routeId = uuidv7();
      routeIds.push(routeId);
      await db.insert(routes).values({
        ...routeTemplate,
        id: routeId,
        authorId: null,
        shareToken: null,
        title: `Parcours ${routeId}`,
        startLocation: farAway,
        bounds: farAwayBounds,
        status: setup.routeStatus ?? 'published',
      });
      const stepId = uuidv7();
      stepIds.push(stepId);
      await db.insert(steps).values({
        ...stepTemplate,
        id: stepId,
        routeId,
        placeId,
        bookingRequired: setup.bookingRequired ?? false,
        bookingUrl: setup.creatorUrl ?? null,
        bookingProvider: setup.creatorUrl ? 'restaurant' : null,
        bookingIsAffiliate: setup.isAffiliate ?? false,
      });
      return stepId;
    },

    async cleanUp(): Promise<void> {
      // Clicks hold no foreign key to their step: they are deleted by step.
      await db.delete(bookingClicks).where(inArray(bookingClicks.stepId, stepIds));
      await db.delete(routes).where(inArray(routes.id, routeIds));
      await db.delete(places).where(inArray(places.id, placeIds));
      await db.delete(affiliatePrograms).where(inArray(affiliatePrograms.id, programIds));
    },
  };
}
