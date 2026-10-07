import { ApiError, GeocodeQuery, GeocodeResult, zoneSearchBox } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { GeocoderUnavailable, type Geocoder } from '../geocode/geocoder';
import { cacheHook } from '../http-cache';
import { countRoutes } from '../search/repository';

/** Requests per minute and per client IP (Filtres-et-Recherche › Recherche textuelle). */
export const GEOCODE_RATE_LIMIT = 30;

export type GeocodeRoutesOptions = {
  /** Null: no source of zones (production without token): every search answers 503. */
  geocoder: Geocoder | null;
  /** Permanent results may be kept by shared caches; temporary ones by no one. */
  isCacheable: boolean;
};

const unavailable: ApiError = { code: 'internal_error', message: 'Geocoding unavailable' };

/**
 * `GET /geocode?q=` (wiki API › découverte): the zones of a text, each with the number of routes
 * of the box the app will search, counted as `/routes/search/count` does, filters aside. Public,
 * without caller: the answer does not depend on who asks. The text is never logged (the logger
 * drops the query string) nor sent anywhere but Mapbox.
 */
export const geocodeRoutes: FastifyPluginAsyncZod<GeocodeRoutesOptions> = async (
  app,
  { geocoder, isCacheable },
) => {
  const noStore = async (
    _request: unknown,
    reply: { header: (name: string, value: string) => unknown },
    payload: unknown,
  ) => {
    reply.header('cache-control', 'no-store');
    return payload;
  };

  app.get(
    '/geocode',
    {
      config: { rateLimit: { max: GEOCODE_RATE_LIMIT, timeWindow: '1 minute' } },
      onSend: isCacheable ? cacheHook(300) : noStore,
      schema: {
        tags: ['discovery'],
        summary:
          'Zones of a text (neighbourhood, district, postcode, city, station) and their routes',
        querystring: GeocodeQuery,
        response: { 200: GeocodeResult, 502: ApiError, 503: ApiError },
      },
    },
    async (request, reply) => {
      if (!geocoder) {
        return reply.code(503).send(unavailable);
      }
      let hits;
      try {
        hits = await geocoder.find(request.query.q);
      } catch (error) {
        if (error instanceof GeocoderUnavailable) {
          return reply.code(502).send(unavailable);
        }
        throw error;
      }
      const zones = await Promise.all(
        hits.map(async ({ envelope, ...hit }) => {
          const bbox = zoneSearchBox(hit.center, envelope);
          const { count } = await countRoutes(app.db, { bbox, sort: 'recommended', limit: 1 });
          return { ...hit, bbox, routeCount: count };
        }),
      );
      // Zones with routes first, each group in the order of Mapbox (a stable sort).
      return {
        zones: zones.toSorted((a, b) => Number(b.routeCount > 0) - Number(a.routeCount > 0)),
      };
    },
  );
};
