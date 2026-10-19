import { and, asc, eq, inArray } from 'drizzle-orm';
import type { buildApp } from '../app';
import type { TestTokenVerifier } from '../auth/test-verifier';
import { media, places, routeUnlocks, routes, steps, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';

type App = Awaited<ReturnType<typeof buildApp>>;

/** Saturday 24 October 2026, 10:00 in Paris: Merci opens at 10:30, L'As du Fallafel is closed. */
export const saturdayTen = '2026-10-24T10:00:00+02:00';

/**
 * Test data of the planning tests, on copies of the demo route: shared database, parallel
 * files. Every route and account created here is deleted by `cleanUp`; the demo is untouched.
 */
export function plannedFixtures(app: () => App, verifier: TestTokenVerifier) {
  const routeIds: string[] = [];
  const uids: string[] = [];
  const stepIds: string[] = [];
  const placeIds: string[] = [];

  /**
   * A copy of the demo route, its first step to book (fictitious link); with `stepPhotos`, the
   * photos of its steps too, deleted by `cleanUp`.
   */
  async function copyDemoRoute(
    values: Partial<typeof routes.$inferInsert> = {},
    { stepPhotos = false } = {},
  ) {
    await seed(app().db);
    const demoId = seedId('route:marais-gourmand');
    const [demo] = await app().db.select().from(routes).where(eq(routes.id, demoId));
    if (!demo) throw new Error('Demo route missing from the seed');
    const id = uuidv7();
    routeIds.push(id);
    await app()
      .db.insert(routes)
      .values({ ...demo, id, shareToken: null, ...values });
    const demoSteps = await app().db.select().from(steps).where(eq(steps.routeId, demoId));
    const copies = new Map(demoSteps.map((step) => [step.id, uuidv7()]));
    const copyOf = (stepId: string) => {
      const copy = copies.get(stepId);
      if (!copy) throw new Error(`Step ${stepId} was not copied`);
      return copy;
    };
    stepIds.push(...copies.values());
    await app()
      .db.insert(steps)
      .values(
        demoSteps.map((step) => ({
          ...step,
          id: copyOf(step.id),
          routeId: id,
          ...(step.position === 0 && {
            bookingRequired: true,
            bookingUrl: 'https://example.com/reserver',
          }),
        })),
      );
    const photos = !stepPhotos
      ? []
      : await app()
          .db.select()
          .from(media)
          .where(and(eq(media.ownerType, 'step'), inArray(media.ownerId, [...copies.keys()])));
    if (photos.length > 0) {
      await app()
        .db.insert(media)
        .values(
          photos.map((photo) => ({ ...photo, id: uuidv7(), ownerId: copyOf(photo.ownerId) })),
        );
    }
    return id;
  }

  /**
   * Moves the first step of the route `routeId` to a fictitious place « Accessible à toute
   * heure » without any hours (D-049), far from the demo so that no search finds it; deleted by
   * `cleanUp`. Returns the id of that step.
   */
  async function alwaysOpenFirstStep(routeId: string) {
    const [first] = await app()
      .db.select({ id: steps.id, placeId: steps.placeId })
      .from(steps)
      .where(eq(steps.routeId, routeId))
      .orderBy(asc(steps.position))
      .limit(1);
    if (!first) throw new Error('The copied route has no step');
    const [demoPlace] = await app()
      .db.select({ cityId: places.cityId })
      .from(places)
      .where(eq(places.id, first.placeId));
    if (!demoPlace) throw new Error('The demo place is missing from the seed');
    const placeId = uuidv7();
    placeIds.push(placeId);
    await app()
      .db.insert(places)
      .values({
        id: placeId,
        cityId: demoPlace.cityId,
        name: 'Square toujours ouvert',
        category: 'park',
        location: { lat: -40, lng: -40 },
        address: 'Adresse fictive',
        verificationStatus: 'unverified',
        alwaysOpen: true,
      });
    await app().db.update(steps).set({ placeId }).where(eq(steps.id, first.id));
    return first.id;
  }

  /** A signed-in account of the given plan, created on its first request. */
  async function signIn(values: Partial<typeof users.$inferInsert> = {}) {
    const { token, uid } = verifier.issue();
    uids.push(uid);
    await app()
      .db.insert(users)
      .values({ firebaseUid: uid, ...values });
    return { authorization: `Bearer ${token}` };
  }

  /** The route bought alone by the signed-in account (D-073), with a fictitious transaction. */
  async function unlock(headers: Record<string, string>, routeId: string) {
    const me = await app().inject({ url: '/v1/me', headers });
    await app()
      .db.insert(routeUnlocks)
      .values({
        userId: me.json<{ id: string }>().id,
        routeId,
        storeTransactionId: `fictitious-${uuidv7()}`,
      });
  }

  async function cleanUp() {
    if (uids.length > 0) await app().db.delete(users).where(inArray(users.firebaseUid, uids));
    if (routeIds.length > 0) await app().db.delete(routes).where(inArray(routes.id, routeIds));
    if (stepIds.length > 0) {
      await app()
        .db.delete(media)
        .where(and(eq(media.ownerType, 'step'), inArray(media.ownerId, stepIds)));
    }
    // After the routes: their steps refer to these places.
    if (placeIds.length > 0) await app().db.delete(places).where(inArray(places.id, placeIds));
  }

  return { copyDemoRoute, alwaysOpenFirstStep, signIn, unlock, cleanUp };
}
