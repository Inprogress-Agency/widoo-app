import { PlannedRouteSnapshot } from '@widoo/shared';
import { and, asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { places, steps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';
import { snapshotOf, timelineOf } from './snapshot';
import { plannedFixtures, saturdayTen } from './test-fixtures';

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());
/** « Accessible à toute heure » and without hours: deleted by `afterAll` (D-049). */
const placeId = uuidv7();

beforeAll(async () => {
  app = await buildApp(testConfig());
});
afterAll(async () => {
  // The routes first: their steps still refer to the fictitious place.
  await fixtures.cleanUp();
  await app.db.delete(places).where(eq(places.id, placeId));
  await app.close();
});

describe('snapshotOf', () => {
  it('freezes the steps, places, hours and estimated trips of a published route', async () => {
    const routeId = await fixtures.copyDemoRoute();
    // The creator chose the metro for the first trip: the mode is kept, the measures estimated.
    const metro = { distanceM: 900, durationMin: 4, mode: 'metro', estimated: false };
    await app.db
      .update(steps)
      .set({ transition: metro })
      .where(and(eq(steps.routeId, routeId), eq(steps.position, 0)));

    const snapshot = PlannedRouteSnapshot.parse(await snapshotOf(app.db, routeId));

    expect(snapshot).toMatchObject({ id: routeId, access: 'free', timezone: 'Europe/Paris' });
    expect(snapshot.steps.map((step) => step.position)).toEqual([0, 1, 2, 3]);
    expect(snapshot.steps[0]).toMatchObject({
      bookingRequired: true,
      bookingUrl: 'https://example.com/reserver',
    });
    expect(snapshot.steps[0]?.transition).toMatchObject({ mode: 'metro', estimated: false });
    expect(snapshot.steps[0]?.transition?.durationMin).not.toBe(4);
    expect(snapshot.steps[1]?.transition).toMatchObject({ mode: 'walk', estimated: true });
    expect(snapshot.steps[3]?.transition).toBeNull();
    expect(snapshot.steps[0]?.place.hours).toContainEqual({
      weekday: 5,
      opens: '10:30',
      closes: '19:30',
      validFrom: null,
      validTo: null,
    });
  });

  it('refuses a route that is missing or not published', async () => {
    expect(await snapshotOf(app.db, uuidv7())).toBeUndefined();
    const draftId = await fixtures.copyDemoRoute({ status: 'draft' });
    expect(await snapshotOf(app.db, draftId)).toBeUndefined();
  });
});

describe('timelineOf', () => {
  it('dates the snapshot and reads its hours in the city', async () => {
    const snapshot = PlannedRouteSnapshot.parse(
      await snapshotOf(app.db, await fixtures.copyDemoRoute()),
    );
    const timeline = timelineOf(snapshot, new Date(saturdayTen));

    expect(timeline.startsAt).toBe('2026-10-24T08:00:00.000Z');
    expect(timeline.steps.map((step) => step.stepId)).toEqual(snapshot.steps.map((s) => s.id));
    // Merci opens at 10:30 and L'As du Fallafel is closed on Saturdays.
    expect(timeline.steps[0]?.conflicts).toEqual(['closed_at_arrival']);
    expect(timeline.steps[1]?.conflicts).toEqual(['closed_that_day']);
  });

  it('raises no conflict for an always-open place without hours, even late (D-049)', async () => {
    // A fictitious always-open place without any hour, where the first step of the copy goes.
    const routeId = await fixtures.copyDemoRoute();
    const [first] = await app.db
      .select({ id: steps.id, placeId: steps.placeId })
      .from(steps)
      .where(eq(steps.routeId, routeId))
      .orderBy(asc(steps.position))
      .limit(1);
    if (!first) throw new Error('The copied route has no step');
    const [demoPlace] = await app.db
      .select({ cityId: places.cityId })
      .from(places)
      .where(eq(places.id, first.placeId));
    if (!demoPlace) throw new Error('The demo place is missing from the seed');
    await app.db.insert(places).values({
      id: placeId,
      cityId: demoPlace.cityId,
      name: 'Square toujours ouvert',
      category: 'park',
      location: { lat: -40, lng: -40 },
      address: 'Adresse fictive',
      verificationStatus: 'unverified',
      alwaysOpen: true,
    });
    await app.db.update(steps).set({ placeId }).where(eq(steps.id, first.id));

    const snapshot = PlannedRouteSnapshot.parse(await snapshotOf(app.db, routeId));
    expect(snapshot.steps[0]?.place).toMatchObject({ alwaysOpen: true, hours: [] });
    const timeline = timelineOf(snapshot, new Date('2026-10-24T23:00:00+02:00'));

    expect(timeline.steps[0]?.conflicts).toEqual([]);
  });
});
