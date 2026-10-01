import { describe, expect, it, vi } from 'vitest';
import { fetchSharedRoute, readSharedRouteKey } from './fetch';
import { apiRoute } from '@/test/api-route';

const id = apiRoute.id;

describe('readSharedRouteKey', () => {
  it('reads a route id, with or without the token of a private link', () => {
    expect(readSharedRouteKey(id, undefined)).toEqual({ id });
    expect(readSharedRouteKey(id.toUpperCase(), 'abcDEF123_-xyz')).toEqual({
      id,
      token: 'abcDEF123_-xyz',
    });
  });

  it('refuses anything else without calling the API', () => {
    expect(readSharedRouteKey('montmartre', undefined)).toBeNull();
    expect(readSharedRouteKey('../me', undefined)).toBeNull();
    expect(readSharedRouteKey(id, 'short')).toBeNull();
    expect(readSharedRouteKey(id, 'with space or/slash')).toBeNull();
  });
});

function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => Response.json(body, { status }));
}

describe('fetchSharedRoute', () => {
  it('asks the API for the route in the language of the page, cached 5 minutes', async () => {
    const fetchImpl = answer(200, apiRoute);
    const result = await fetchSharedRoute('https://api.example', { id }, 'en', fetchImpl);

    expect(result.kind).toBe('public');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe(`https://api.example/v1/routes/${id}`);
    expect(init).toMatchObject({
      headers: { 'accept-language': 'en' },
      next: { revalidate: 300, tags: [`route:${id}`] },
    });
  });

  it('sends the token of a private link and never caches the answer', async () => {
    const fetchImpl = answer(200, { ...apiRoute, status: 'private' });
    const result = await fetchSharedRoute(
      'https://api.example',
      { id, token: 'abcDEF123_-xyz' },
      'fr',
      fetchImpl,
    );

    expect(result.kind).toBe('private');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe(`https://api.example/v1/routes/${id}?token=abcDEF123_-xyz`);
    expect(init).toMatchObject({ cache: 'no-store' });
    expect(init).not.toHaveProperty('next');
  });

  it('reads a removed and an unknown route', async () => {
    const removed = answer(410, { removedAt: '2026-09-20T09:00:00Z' });
    expect(await fetchSharedRoute('https://api.example', { id }, 'fr', removed)).toEqual({
      kind: 'removed',
      removedAt: '2026-09-20T09:00:00Z',
    });
    const unknown = answer(404, { code: 'not_found' });
    expect(await fetchSharedRoute('https://api.example', { id }, 'fr', unknown)).toEqual({
      kind: 'unknown',
    });
  });
});
