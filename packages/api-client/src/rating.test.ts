import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient } from '.';

// Fictitious outing, route and review.
const id = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e20';
const routeId = '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e21';
const at = '2026-10-24T14:50:00.000Z';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(response: Response, token: string | null = 'token-1') {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
  const client = createApiClient({
    baseUrl: 'http://10.0.2.2:8080',
    fetch,
    getToken: async () => token,
  });
  const call = () => fetch.mock.calls[0];
  const headers = () => call()?.[1]?.headers as Record<string, string>;
  return { client, call, headers };
}

describe('rateOuting', () => {
  it('posts the rating and comment of an outing, signed in', async () => {
    const mine = {
      rating: 5,
      comment: 'Parfait',
      createdAt: at,
      updatedAt: at,
      routeRating: { average: 4.5, count: 2 },
    };
    const { client, call, headers } = setup(json(200, mine));
    await expect(client.rateOuting(id, { rating: 5, comment: 'Parfait' })).resolves.toEqual(mine);
    expect(call()?.[0]).toBe(`http://10.0.2.2:8080/v1/me/planned/${id}/rating`);
    expect(call()?.[1]?.method).toBe('POST');
    expect(call()?.[1]?.body).toBe(JSON.stringify({ rating: 5, comment: 'Parfait' }));
    expect(headers().authorization).toBe('Bearer token-1');
  });

  it('throws the 409 of an outing that does not open the rating', async () => {
    const body = { code: 'conflict', message: 'Not rateable', details: {} };
    const error = await setup(json(409, body))
      .client.rateOuting(id, { rating: 3 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).status).toBe(409);
  });
});

describe('listRouteRatings', () => {
  it('reads a page of reviews, without a token signed out', async () => {
    const review = { id, firstName: 'Camille', rating: 4, comment: null, createdAt: at };
    const { client, call, headers } = setup(json(200, { items: [review], nextCursor: 'c2' }), null);
    const page = await client.listRouteRatings(routeId, { cursor: 'c1', limit: 20 });
    expect(page).toEqual({ items: [review], nextCursor: 'c2' });
    expect(call()?.[0]).toBe(
      `http://10.0.2.2:8080/v1/routes/${routeId}/ratings?cursor=c1&limit=20`,
    );
    expect(headers().authorization).toBeUndefined();
  });
});
