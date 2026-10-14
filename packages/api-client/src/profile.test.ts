import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient } from '.';

// Fictitious creator without any published route shown.
const id = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e11';
const profile = {
  id,
  firstName: 'Camille',
  avatarUrl: null,
  createdAt: '2026-03-14T10:00:00.000Z',
  neighborhood: 'Paris 11e',
  bio: null,
  certified: false,
  certification: { criteria: [] },
  routesPublished: null,
  routesCompleted: null,
  ratingAvg: null,
  verifiedPlaces: null,
  anecdotes: [],
  featuredRoutes: [],
  routes: { items: [], nextCursor: null },
  moodCounts: {},
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

describe('getPublicProfile', () => {
  it('reads the profile, with the token of the signed-in user when there is one', async () => {
    const { client, call } = setup(json(200, profile), 'token-1');
    await expect(client.getPublicProfile(id)).resolves.toEqual({ kind: 'profile', profile });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/users/${id}/profile`);
    expect((call()?.[1]?.headers as Record<string, string>).authorization).toBe('Bearer token-1');
  });

  it('sends the sort, the moods and the page of the published routes', async () => {
    const { client, call } = setup(json(200, profile));
    await client.getPublicProfile(id, { sort: 'rating', moods: ['food', 'nature'], cursor: 'c 2' });
    expect(call()?.[0]).toBe(
      `http://10.0.2.2:8080/v1/users/${id}/profile?sort=rating&moods=food&moods=nature&cursor=c+2`,
    );
  });

  it('answers unavailable for a masked profile or a deleted account (404)', async () => {
    const response = json(404, { code: 'not_found', message: 'Not found' });
    await expect(setup(response).client.getPublicProfile(id)).resolves.toEqual({
      kind: 'unavailable',
    });
  });

  it.each([
    ['a server error', json(500, { code: 'internal', message: 'Boom' })],
    ['a profile this build cannot read', json(200, { ...profile, firstName: '' })],
  ])('throws on %s', async (_, response) => {
    await expect(setup(response).client.getPublicProfile(id)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});
