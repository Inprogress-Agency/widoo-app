import { PlannedRouteSnapshot } from '@widoo/shared';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { steps } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';
import { snapshotOf, timelineOf } from './snapshot';
import { plannedFixtures, saturdayTen } from './test-fixtures';

let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());

beforeAll(async () => {
  app = await buildApp(testConfig());
});
afterAll(async () => {
  await fixtures.cleanUp();
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
    const routeId = await fixtures.copyDemoRoute();
    await fixtures.alwaysOpenFirstStep(routeId);

    const snapshot = PlannedRouteSnapshot.parse(await snapshotOf(app.db, routeId));
    expect(snapshot.steps[0]?.place).toMatchObject({ alwaysOpen: true, hours: [] });
    const timeline = timelineOf(snapshot, new Date('2026-10-24T23:00:00+02:00'));

    expect(timeline.steps[0]?.conflicts).toEqual([]);
  });
});
