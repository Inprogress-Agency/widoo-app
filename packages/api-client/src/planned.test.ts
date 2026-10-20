import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient } from '.';

// Fictitious planning: one step with a booking.
const id = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e20';
const routeId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e21';
const stepId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e22';
const at = '2026-10-24T08:00:00.000Z';
const planned = {
  id,
  routeId,
  status: 'planned',
  startsAt: at,
  completedAt: null,
  closedBy: null,
  route: {
    id: routeId,
    title: 'Parcours fictif',
    access: 'free',
    isOfficial: true,
    timezone: 'Europe/Paris',
    steps: [
      {
        id: stepId,
        position: 0,
        title: null,
        description: null,
        durationMin: 60,
        costPerPersonEur: 15,
        bookingRequired: true,
        bookingUrl: 'https://example.com/reserver',
        bookingProvider: 'ticketing',
        transitionNote: null,
        transition: null,
        place: {
          id: stepId,
          name: 'Lieu fictif',
          category: 'museum',
          location: { lat: 48.86, lng: 2.35 },
          address: '1 rue Fictive, Paris',
          isIndoor: true,
          hours: [],
        },
      },
    ],
  },
  timeline: {
    startsAt: at,
    endsAt: at,
    steps: [{ stepId, arrivesAt: at, leavesAt: at, conflicts: ['hours_unknown'] }],
  },
  checklist: [{ stepId, isChecked: false }],
  steps: [{ stepId, arrivedAt: null, doneAt: null, skippedAt: null }],
  myRating: null,
  createdAt: at,
  updatedAt: at,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(response: Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
  const client = createApiClient({
    baseUrl: 'http://10.0.2.2:8080',
    fetch,
    getToken: async () => 'token-1',
  });
  const call = () => fetch.mock.calls[0];
  const headers = () => call()?.[1]?.headers as Record<string, string>;
  return { client, call, headers };
}

describe('listPlanned', () => {
  it('reads the plannings of one status, signed in', async () => {
    const { client, call, headers } = setup(json(200, { items: [planned], nextCursor: null }));
    const list = await client.listPlanned({ status: 'planned', limit: 50 });
    expect(list.items[0]?.id).toBe(id);
    expect(call()?.[0]).toBe('http://10.0.2.2:8080/v1/me/planned?status=planned&limit=50');
    expect(headers().authorization).toBe('Bearer token-1');
  });

  it('asks them all without a query', async () => {
    const { client, call } = setup(json(200, { items: [], nextCursor: null }));
    await client.listPlanned();
    expect(call()?.[0]).toBe('http://10.0.2.2:8080/v1/me/planned');
  });
});

describe('createPlanned', () => {
  it('posts the route and its start', async () => {
    const { client, call } = setup(json(201, planned));
    const body = { routeId, startsAt: '2026-10-24T10:00:00+02:00' };
    await expect(client.createPlanned(body)).resolves.toMatchObject({ id, status: 'planned' });
    expect(call()?.[1]?.method).toBe('POST');
    expect(call()?.[1]?.body).toBe(JSON.stringify(body));
  });

  it('throws the 402 of a Premium route without the right to it', async () => {
    const body = { code: 'premium_required', message: 'Premium', details: {} };
    const error = await setup(json(402, body))
      .client.createPlanned({ routeId, startsAt: at })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).status).toBe(402);
  });
});

describe('getPlanned', () => {
  it('reads one planning of the caller, signed in', async () => {
    const { client, call, headers } = setup(json(200, planned));
    await expect(client.getPlanned(id)).resolves.toMatchObject({ id, status: 'planned' });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}`);
    expect(call()?.[1]?.method).toBe('GET');
    expect(headers().authorization).toBe('Bearer token-1');
  });
});

describe('updatePlanned', () => {
  it('patches the start and the ticked bookings of a planning', async () => {
    const { client, call } = setup(json(200, planned));
    const update = { startsAt: at, checklist: [{ stepId, isChecked: true }] };
    await client.updatePlanned(id, update);
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}`);
    expect(call()?.[1]?.method).toBe('PATCH');
    expect(call()?.[1]?.body).toBe(JSON.stringify(update));
  });
});

describe('markPlannedStepDone', () => {
  it('posts « Étape suivante » of a step, without a body', async () => {
    const { client, call, headers } = setup(json(200, planned));
    await client.markPlannedStepDone(id, stepId);
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}/steps/${stepId}/done`);
    expect(call()?.[1]?.method).toBe('POST');
    expect(call()?.[1]?.body).toBeUndefined();
    expect(headers().authorization).toBe('Bearer token-1');
  });
});

describe('markPlannedStepArrived', () => {
  it("posts « J'y suis » of a step, without a body", async () => {
    const { client, call, headers } = setup(json(200, planned));
    await expect(client.markPlannedStepArrived(id, stepId)).resolves.toMatchObject({ id });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}/steps/${stepId}/arrived`);
    expect(call()?.[1]?.method).toBe('POST');
    expect(call()?.[1]?.body).toBeUndefined();
    expect(headers().authorization).toBe('Bearer token-1');
  });
});

describe('skipPlannedStep', () => {
  it('posts « Passer cette étape » of a step, without a body', async () => {
    const { client, call, headers } = setup(json(200, planned));
    await client.skipPlannedStep(id, stepId);
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}/steps/${stepId}/skip`);
    expect(call()?.[1]?.method).toBe('POST');
    expect(call()?.[1]?.body).toBeUndefined();
    expect(headers().authorization).toBe('Bearer token-1');
  });
});

describe('unskipPlannedStep', () => {
  it('deletes the skip of a step (D-033, « Annuler »)', async () => {
    const { client, call } = setup(json(200, planned));
    await client.unskipPlannedStep(id, stepId);
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}/steps/${stepId}/skip`);
    expect(call()?.[1]?.method).toBe('DELETE');
  });
});

describe('getPlannedMapsUrl', () => {
  it('reads Google Maps to the next step', async () => {
    const url =
      'https://www.google.com/maps/dir/?api=1&destination=48.86%2C2.35&travelmode=walking';
    const { client, call } = setup(json(200, { stepId, url }));
    await expect(client.getPlannedMapsUrl(id)).resolves.toEqual({ stepId, url });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}/maps-url`);
  });

  it('throws the 409 of a Go without a step left', async () => {
    const body = { code: 'conflict', message: 'No step left to go to', details: {} };
    const error = await setup(json(409, body))
      .client.getPlannedMapsUrl(id)
      .catch((caught: unknown) => caught);
    expect((error as ApiRequestError).status).toBe(409);
  });
});
