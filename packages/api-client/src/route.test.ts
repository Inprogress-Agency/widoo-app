import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient } from '.';

// Fictitious route: one free step.
const id = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e10';
const at = '2026-10-13T08:00:00.000Z';
const route = {
  id,
  title: 'Parcours fictif',
  coverUrl: null,
  isOfficial: true,
  author: null,
  access: 'free',
  isVerified: false,
  moods: ['food'],
  audiences: ['friends'],
  conditions: [],
  transport: 'walk',
  district: null,
  neighborhood: null,
  durationMin: 60,
  durationBucket: '1_2h',
  budgetPerPersonEur: 0,
  budgetBucket: 'free',
  distanceM: 0,
  rating: { average: null, count: 0 },
  stepCount: 1,
  isLocked: false,
  status: 'published',
  description: 'Description fictive',
  photoUrls: [],
  walkingDistanceM: 0,
  effort: 'easy',
  startAccess: null,
  creator: { routesPublished: 1, isCertified: false },
  sharedBy: null,
  reviews: [],
  timeline: {
    startsAt: at,
    endsAt: at,
    steps: [{ stepId: id, arrivesAt: at, leavesAt: at, conflicts: [] }],
  },
  steps: [
    {
      id,
      position: 0,
      isLocked: false,
      title: null,
      description: null,
      durationMin: 60,
      costPerPersonEur: null,
      bookingRequired: false,
      bookingUrl: null,
      bookingProvider: null,
      bookingNote: null,
      bookingIsAffiliate: false,
      endsOn: null,
      transitionNote: null,
      transition: null,
      place: {
        id,
        name: 'Lieu fictif',
        category: 'park',
        location: { lat: 48.86, lng: 2.35 },
        address: '1 rue Fictive, Paris',
        isIndoor: false,
        photoUrl: null,
        verificationStatus: 'verified',
        verifiedAt: null,
        hours: [],
      },
      verification: { confirmations: 0, lastConfirmedAt: null, reports: null },
    },
  ],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(response: Response, token: string | null = null) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
  const client = createApiClient({
    baseUrl: 'http://10.0.2.2:8080',
    fetch,
    getToken: async () => token,
  });
  const call = () => fetch.mock.calls[0];
  return { client, call };
}

describe('getRoute', () => {
  it('reads the route sheet, with the token of the signed-in user when there is one', async () => {
    const { client, call } = setup(json(200, route), 'token-1');
    await expect(client.getRoute(id)).resolves.toMatchObject({ kind: 'route', route: { id } });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/routes/${id}`);
    expect((call()?.[1]?.headers as Record<string, string>).authorization).toBe('Bearer token-1');
  });

  it('sends the share token of a private route in the query', async () => {
    const { client, call } = setup(json(200, route));
    await client.getRoute(id, { token: 'a b&c' });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/routes/${id}?token=a+b%26c`);
  });

  it('answers the date of a withdrawn route (410 route_removed)', async () => {
    const body = { code: 'route_removed', message: 'Removed', details: { removedAt: at } };
    await expect(setup(json(410, body)).client.getRoute(id)).resolves.toEqual({
      kind: 'removed',
      removedAt: at,
    });
  });

  it.each([
    ['a 404', json(404, { code: 'not_found', message: 'Not found' })],
    ['a 410 without its date', json(410, { code: 'route_removed', message: 'Removed' })],
    ['a sheet this build cannot read', json(200, { ...route, effort: 'hard' })],
  ])('throws on %s', async (_, response) => {
    await expect(setup(response).client.getRoute(id)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe('getRouteTimeline', () => {
  it('asks the timeline of a start', async () => {
    const timeline = route.timeline;
    const { client, call } = setup(json(200, timeline));
    await expect(client.getRouteTimeline(id, at)).resolves.toEqual(timeline);
    expect(call()?.[0]).toBe(
      `http://10.0.2.2:8080/v1/routes/${id}/timeline?startsAt=2026-10-13T08%3A00%3A00.000Z`,
    );
  });
});
