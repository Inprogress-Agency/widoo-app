import { ApiError, GeocodeResult, zoneSearchBox } from '@widoo/shared';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { seed } from '../db/seed';
import { GeocoderUnavailable, type Geocoder, type ZoneHit } from '../geocode/geocoder';
import { countRoutes } from '../search/repository';
import { testConfig } from '../test-config';
import { GEOCODE_RATE_LIMIT, geocodeRoutes } from './geocode';

// Fictitious zones: one over the demo routes of Montmartre, one in the sea, without routes.
const montmartre: ZoneHit = {
  id: 'test-montmartre',
  name: 'Montmartre',
  kind: 'neighborhood',
  area: 'Paris 18e',
  center: { lat: 48.8867, lng: 2.3431 },
  envelope: { west: 2.3305, south: 48.8805, east: 2.3485, north: 48.8925 },
};
const offshore: ZoneHit = {
  id: 'test-offshore',
  name: 'Station au large',
  kind: 'station',
  area: null,
  center: { lat: 46, lng: -5 },
  envelope: null,
};
/** The zone the API answers for a hit: its envelope replaced by the box to search. */
const zoneOf = ({ id, name, kind, area, center, envelope }: ZoneHit, routeCount: number) => ({
  id,
  name,
  kind,
  area,
  center,
  bbox: zoneSearchBox(center, envelope),
  routeCount,
});
const hits: Geocoder = { find: async () => [montmartre, offshore] };

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { geocoder: hits });
  await seed(app.db);
});
afterAll(async () => {
  await app.close();
});

describe('GET /v1/geocode', () => {
  it('answers each zone with the box to search and its number of routes', async () => {
    const response = await app.inject({ url: '/v1/geocode?q=Montmartre' });
    expect(response.statusCode, response.body).toBe(200);
    const { zones } = GeocodeResult.parse(response.json());
    const bbox = zoneSearchBox(montmartre.center, montmartre.envelope);
    const { count } = await countRoutes(app.db, { bbox, sort: 'recommended', limit: 1 });
    expect(count).toBeGreaterThan(0);
    expect(zones).toEqual([zoneOf(montmartre, count), zoneOf(offshore, 0)]);
    // Temporary results of Mapbox: no cache keeps them.
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('puts the zones with routes first, the others in the order of the source', async () => {
    const reversed = await buildApp(testConfig(), {
      geocoder: { find: async () => [offshore, montmartre] },
    });
    const response = await reversed.inject({ url: '/v1/geocode?q=Montmartre' });
    await reversed.close();
    const { zones } = GeocodeResult.parse(response.json());
    expect(zones.map((zone) => zone.id)).toEqual(['test-montmartre', 'test-offshore']);
  });

  it.each([
    ['a single character', 'q=a'],
    ['no text', ''],
    ['an unknown key', 'q=canal&types=address'],
  ])('refuses %s', async (_, query) => {
    const response = await app.inject({ url: `/v1/geocode?${query}` });
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });

  it(`answers 429 rate_limited past ${GEOCODE_RATE_LIMIT} searches a minute from one client`, async () => {
    const limited = await buildApp(testConfig(), { geocoder: { find: async () => [] } });
    const statuses: number[] = [];
    for (let index = 0; index <= GEOCODE_RATE_LIMIT; index += 1) {
      statuses.push((await limited.inject({ url: `/v1/geocode?q=zone${index}` })).statusCode);
    }
    const other = await limited.inject({ url: '/v1/geocode?q=zone', remoteAddress: '203.0.113.9' });
    const config = await limited.inject({ url: '/v1/config' });
    await limited.close();
    expect(statuses.slice(0, GEOCODE_RATE_LIMIT).every((status) => status === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    // Per client IP, and for this route only.
    expect(other.statusCode).toBe(200);
    expect(config.statusCode).toBe(200);
  });

  it('answers 502 when no source of zones answers', async () => {
    const failing = await buildApp(testConfig(), {
      geocoder: {
        find: async () => {
          throw new GeocoderUnavailable();
        },
      },
    });
    const response = await failing.inject({ url: '/v1/geocode?q=Montmartre' });
    await failing.close();
    expect(response.statusCode).toBe(502);
    expect(ApiError.parse(response.json())).toEqual({
      code: 'internal_error',
      message: 'Geocoding unavailable',
    });
  });

  it('answers local zones without Mapbox token outside production', async () => {
    const local = await buildApp(testConfig());
    const response = await local.inject({ url: '/v1/geocode?q=republique' });
    await local.close();
    const { zones } = GeocodeResult.parse(response.json());
    expect(zones.map((zone) => [zone.name, zone.kind])).toEqual([['République', 'station']]);
  });

  it('answers 503 without geocoder, as production does without token', async () => {
    const bare = Fastify();
    bare.setValidatorCompiler(validatorCompiler);
    bare.setSerializerCompiler(serializerCompiler);
    await bare.register(geocodeRoutes, { prefix: '/v1', geocoder: null, isCacheable: false });
    const response = await bare.inject({ url: '/v1/geocode?q=Montmartre' });
    await bare.close();
    expect(response.statusCode).toBe(503);
  });

  it('lets shared caches keep permanent results', async () => {
    const permanent = await buildApp(testConfig({ MAPBOX_GEOCODING_PERMANENT: 'true' }), {
      geocoder: hits,
    });
    const response = await permanent.inject({ url: '/v1/geocode?q=Montmartre' });
    await permanent.close();
    expect(response.headers['cache-control']).toBe('public, max-age=300');
  });
});
