import { DirectionsUnavailable, type DirectionsLeg } from '@widoo/orchestration';
import { describe, expect, it, vi } from 'vitest';
import { createMapboxDirections, type DirectionsFailure } from './mapbox';

const token = 'sk.fictitious-directions-token-0123456789';
const leg: DirectionsLeg = {
  from: { lat: 48.8606, lng: 2.3376 },
  to: { lat: 48.853, lng: 2.3499 },
  profile: 'walking',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const okAnswer = {
  code: 'Ok',
  routes: [{ distance: 1432.6, duration: 1150.2, geometry: 'o~qiHkpvM`@yA', legs: [] }],
  waypoints: [],
};

function directionsWith(answer: () => Response | Promise<Response>) {
  const urls: URL[] = [];
  const failures: DirectionsFailure[] = [];
  const fetch = vi.fn(async (input: string | URL | Request) => {
    urls.push(new URL(String(input)));
    return answer();
  });
  const provider = createMapboxDirections({
    token,
    fetch: fetch as unknown as typeof globalThis.fetch,
    onFailure: (failure) => failures.push(failure),
  });
  return { provider, urls, failures };
}

describe('createMapboxDirections', () => {
  it('asks the trip in its profile, full geometry as a polyline, without steps', async () => {
    const { provider, urls } = directionsWith(() => json(okAnswer));
    expect(await provider.route(leg)).toEqual({
      distanceM: 1432.6,
      durationS: 1150.2,
      geometry: 'o~qiHkpvM`@yA',
    });
    const [url] = urls;
    expect(url?.origin).toBe('https://api.mapbox.com');
    expect(decodeURIComponent(url?.pathname ?? '')).toBe(
      '/directions/v5/mapbox/walking/2.33760,48.86060;2.34990,48.85300',
    );
    expect(Object.fromEntries(url?.searchParams ?? [])).toEqual({
      alternatives: 'false',
      geometries: 'polyline',
      overview: 'full',
      steps: 'false',
      access_token: token,
    });
  });

  it.each([
    ['no route between the points', () => json({ code: 'NoRoute', routes: [] }), 'no_route'],
    ['a point far from any road', () => json({ code: 'NoSegment' }, 422), 'no_route'],
    ['a refused token', () => json({ message: 'Not Authorized' }, 401), 401],
    ['a rate limit', () => json({ message: 'Too Many Requests' }, 429), 429],
    ['a server error without JSON', () => new Response('oops', { status: 503 }), 503],
    ['an answer without route', () => json({ code: 'Ok', routes: [] }), 'invalid'],
    ['an answer that is not JSON', () => new Response('<html>'), 'invalid'],
  ] as const)('is unavailable on %s, reporting why', async (_, answer, status) => {
    const { provider, failures } = directionsWith(answer);
    await expect(provider.route(leg)).rejects.toBeInstanceOf(DirectionsUnavailable);
    expect(failures).toEqual([{ profile: 'walking', status }]);
  });

  it('is unavailable when the network fails or Mapbox is too slow', async () => {
    const network = directionsWith(() => {
      throw new TypeError('fetch failed');
    });
    await expect(network.provider.route(leg)).rejects.toBeInstanceOf(DirectionsUnavailable);
    expect(network.failures).toEqual([{ profile: 'walking', status: 'network' }]);

    const slow = directionsWith(() => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });
    await expect(slow.provider.route(leg)).rejects.toBeInstanceOf(DirectionsUnavailable);
    expect(slow.failures).toEqual([{ profile: 'walking', status: 'timeout' }]);
  });

  it('never puts the token in what it reports', async () => {
    const { provider, failures } = directionsWith(() => json({}, 500));
    await expect(provider.route(leg)).rejects.not.toThrow(token);
    expect(JSON.stringify(failures)).not.toContain(token);
  });
});
