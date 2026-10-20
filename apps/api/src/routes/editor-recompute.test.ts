import type { DirectionsLeg, DirectionsProvider } from '@widoo/orchestration';
import { OwnRoute } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { seedId } from '../db/seed';
import { places } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { demoPlaceIds, editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';

// The engine in the editor, on our estimates only (D-088): a fake provider in place of Mapbox
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
const [victorHugo, carnavalet] = demoPlaceIds as [string, string];

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
const issuesOf = (route: OwnRoute) =>
  route.warnings.map((issue) => [issue.code, issue.stepPosition]);

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
    expect(legs).toEqual([]);
  });
});
