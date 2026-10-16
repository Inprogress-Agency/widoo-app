import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '.';

// Fictitious route of the caller, in review.
const ownRoute = {
  id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e30',
  status: 'pending',
  isOfficial: false,
  title: 'Parcours fictif',
  shareToken: null,
  publishedAt: null,
  updatedAt: '2026-10-14T08:00:00.000Z',
  revision: null,
  stepCount: 3,
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

describe('listMyRoutes', () => {
  it('reads the routes of the caller, signed in', async () => {
    const { client, call, headers } = setup(json(200, { items: [ownRoute], nextCursor: null }));
    const list = await client.listMyRoutes({ limit: 50 });
    expect(list.items[0]).toMatchObject({ status: 'pending', stepCount: 3 });
    expect(call()?.[0]).toBe('http://10.0.2.2:8080/v1/me/routes?limit=50');
    expect(headers().authorization).toBe('Bearer token-1');
  });

  it('asks for the next page by its cursor', async () => {
    const cursor = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e31';
    const { client, call } = setup(json(200, { items: [], nextCursor: null }));
    await client.listMyRoutes({ cursor });
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/routes?cursor=${cursor}`);
  });

  it('rejects an answer that is not a list of routes', async () => {
    const { client } = setup(json(200, { items: [{ id: 'x' }], nextCursor: null }));
    await expect(client.listMyRoutes()).rejects.toThrow();
  });
});
