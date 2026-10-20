import type { DirectionsLeg, DirectionsProvider } from '@widoo/orchestration';
import { OwnRoute } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { seedId } from '../db/seed';
import { places, routes } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { demoPlaceIds, editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';

// `computed` follows the steps, on our estimates only (D-088): a fake provider in place of Mapbox
// records any call, and none may come. Tuesday 20 October 2026, 10:00 in Paris, for the hours.
const legs: DirectionsLeg[] = [];
const provider: DirectionsProvider = {
  route: async (leg) => {
    legs.push(leg);
    return { distanceM: 1000, durationS: 600, geometry: 'a~l~Fjk~uOwHJ' };
  },
};

let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = editorFixtures(() => app, verifier);
const ownPlaceIds: string[] = [];

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-20T08:00:00Z') });
  app = await buildApp(testConfig(), { tokenVerifier: verifier, directions: provider });
});
afterAll(async () => {
  await fixtures.cleanUp();
  if (ownPlaceIds.length > 0) await app.db.delete(places).where(inArray(places.id, ownPlaceIds));
  await app.close();
  vi.useRealTimers();
});

type Headers = Record<string, string>;
const [victorHugo, carnavalet, cognacqJay] = demoPlaceIds as [string, string, string];

async function newRoute(headers: Headers) {
  const created = await app.inject({ method: 'POST', url: '/v1/routes', headers, payload: {} });
  return OwnRoute.parse(created.json()).id;
}
async function putSteps(headers: Headers, id: string, steps: object[]) {
  const response = await app.inject({
    method: 'PUT',
    url: `/v1/routes/${id}/steps`,
    headers,
    payload: { steps },
  });
  expect(response.statusCode).toBe(200);
  return OwnRoute.parse(response.json());
}
type StepBody = { id: string; placeId: string; durationMin: number };
/** The steps given back as they are, by id: the first three. */
const stepsOf = (route: OwnRoute) =>
  route.steps.map(({ id, placeId, durationMin }) => ({ id, placeId, durationMin })) as [
    StepBody,
    StepBody,
    StepBody,
  ];
const issuesOf = (route: OwnRoute) =>
  route.warnings.map((issue) => [issue.code, issue.stepPosition]);

/** The row holds what the editor answered: `computed`, its buckets and its transport. */
async function expectStored(route: OwnRoute) {
  const [row] = await app.db.select().from(routes).where(eq(routes.id, route.id));
  const { computed } = route;
  if (!computed) {
    expect(row).toMatchObject({ computed: null, durationBucket: null, budgetBucket: null });
    return;
  }
  expect(row).toMatchObject({
    durationBucket: computed.durationBucket,
    budgetBucket: computed.budgetBucket,
    transport: computed.transport,
    computed: {
      duration_min: computed.durationMin,
      budget_per_person_eur: computed.budgetPerPersonEur,
      distance_m: computed.distanceM,
      walking_m: computed.walkingM,
      effort: computed.effort,
      conditions: computed.conditions,
      start_time: computed.startTime,
      start_computed: computed.startComputed,
      warnings: route.warnings.map((issue) => issue.code),
      proposed_start: route.proposedStart,
      proposed_order: route.proposedOrder,
      computed_at: computed.computedAt,
    },
  });
}

describe('PUT /routes/:id/steps, computed by the engine (D-088)', () => {
  it('recomputes and stores computed when a step is added, changed, moved or removed', async () => {
    legs.length = 0;
    const headers = await fixtures.signIn();
    const id = await newRoute(headers);

    const two = await putSteps(headers, id, [
      { placeId: victorHugo, durationMin: 45, costPerPersonEur: 0 },
      { placeId: carnavalet, durationMin: 45, costPerPersonEur: 12 },
    ]);
    const trip = two.steps[0]?.transition?.durationMin ?? 0;
    expect(two.computed).toMatchObject({
      durationMin: 90 + trip,
      budgetPerPersonEur: 12,
      durationBucket: '1_2h',
      budgetBucket: 'low',
      transport: 'walk',
      startTime: '14:00',
      startComputed: true,
      conditions: ['no_booking', 'indoor'],
    });
    await expectStored(two);

    const [first, second] = stepsOf(two);
    const added = await putSteps(headers, id, [
      first,
      second,
      { placeId: cognacqJay, durationMin: 200, costPerPersonEur: 60, bookingRequired: true },
    ]);
    expect(added.computed).toMatchObject({ durationBucket: 'half_day', budgetBucket: 'medium' });
    expect(added.computed?.conditions).toEqual(['indoor']);
    await expectStored(added);

    const [, , third] = stepsOf(added);
    const changed = await putSteps(headers, id, [{ ...first, durationMin: 60 }, second, third]);
    expect(changed.computed?.durationMin).toBe((added.computed?.durationMin ?? 0) + 15);
    await expectStored(changed);

    const moved = await putSteps(headers, id, [third, first, second]);
    expect(moved.steps.map((step) => step.placeId)).toEqual([cognacqJay, victorHugo, carnavalet]);
    expect(moved.computed?.distanceM).not.toBe(changed.computed?.distanceM);
    await expectStored(moved);

    const removed = await putSteps(headers, id, [first]);
    expect(removed.computed).toMatchObject({ durationMin: 45, distanceM: 0 });
    await expectStored(removed);
    await expectStored(await putSteps(headers, id, []));
    expect(legs).toEqual([]);
  });
});

describe('the warnings of the engine in the editor (#48)', () => {
  it('warns closed_at_arrival before the opening, with the start that fits (D-049)', async () => {
    const headers = await fixtures.signIn();
    const id = await newRoute(headers);
    await app.inject({
      method: 'PATCH',
      url: `/v1/routes/${id}`,
      headers,
      payload: { suggestedStart: '08:00' },
    });
    const route = await putSteps(headers, id, [
      { placeId: victorHugo, durationMin: 45 },
      { placeId: carnavalet, durationMin: 45 },
    ]);
    expect(issuesOf(route)).toEqual([
      ['closed_at_arrival', 0],
      ['closed_at_arrival', 1],
    ]);
    expect(route.computed).toMatchObject({ startTime: '08:00', startComputed: false });
    expect(route.proposedStart).toBe('10:00');
    expect(route.proposedOrder).toBeNull();
    await expectStored(route);
  });

  it('warns back_and_forth with the order « Réordonner » applies (D-049)', async () => {
    const headers = await fixtures.signIn();
    const id = await newRoute(headers);
    const route = await putSteps(headers, id, [
      { placeId: victorHugo, durationMin: 60 },
      { placeId: seedId('place:parvis-sacre-coeur'), durationMin: 60 },
      { placeId: carnavalet, durationMin: 60 },
    ]);
    expect(issuesOf(route)).toEqual([['back_and_forth', null]]);
    expect(route.proposedOrder).toEqual([0, 2, 1]);
    expect(route.proposedStart).toBeNull();
    await expectStored(route);
  });

  it('warns unverified_place for a place never verified', async () => {
    const headers = await fixtures.signIn();
    const [demo] = await app.db
      .select({ cityId: places.cityId })
      .from(places)
      .where(eq(places.id, victorHugo));
    const placeId = uuidv7();
    ownPlaceIds.push(placeId);
    await app.db.insert(places).values({
      id: placeId,
      cityId: demo?.cityId ?? '',
      name: 'Square fictif',
      category: 'park',
      location: { lat: 48.8552, lng: 2.3655 },
      address: 'Adresse fictive',
      verificationStatus: 'unverified',
      alwaysOpen: true,
    });
    const id = await newRoute(headers);
    const route = await putSteps(headers, id, [
      { placeId: victorHugo, durationMin: 45 },
      { placeId, durationMin: 30 },
    ]);
    expect(issuesOf(route)).toEqual([['unverified_place', 1]]);
    await expectStored(route);
    expect(legs).toEqual([]);
  });
});
