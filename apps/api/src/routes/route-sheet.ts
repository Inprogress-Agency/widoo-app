import type { DirectionsProvider } from '@widoo/orchestration';
import { ApiError, RouteDetail, RouteDetailQuery } from '@widoo/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { cacheHook } from '../http-cache';
import { readSheet } from '../sheet/read';

/**
 * Requests per minute and per client IP on the sheet (Q8): each opening asks Mapbox a trip per
 * leg, whose quota of 300 a minute serves everyone.
 */
export const ROUTE_SHEET_RATE_LIMIT = 60;

export type RouteSheetOptions = {
  /** Mapbox Directions with the server token; null: our estimates only, without line. */
  directions: DirectionsProvider | null;
};

const SheetParams = z.strictObject({ id: z.uuid() });

const hasLinkToken = (request: FastifyRequest) =>
  typeof (request.query as { token?: unknown } | undefined)?.token === 'string';

/**
 * Cache of an answer without data of Mapbox (Site-Web, D-093): public 60 s with an ETag without
 * any token, private and revalidated with a Firebase token, never kept with the token of a
 * private link. Errors are never kept.
 */
export function estimatedCacheHook(maxAgeSeconds: number) {
  const publicOrPrivate = cacheHook(maxAgeSeconds, { dependsOnCaller: true });
  return async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    if (reply.statusCode !== 200) {
      reply.header('cache-control', 'no-store');
      return payload;
    }
    if (hasLinkToken(request)) {
      reply.header('cache-control', 'private, no-store');
      return payload;
    }
    return publicOrPrivate(request, reply, payload);
  };
}

/** No copy anywhere: the answer holds results of Mapbox, which may not be stored (D-088). */
async function noStore(_request: FastifyRequest, reply: FastifyReply, payload: unknown) {
  reply.header('cache-control', 'no-store');
  return payload;
}

/**
 * `GET /routes/:id` (wiki API › Fiche parcours, D-093): the sheet the caller may read, Premium
 * steps locked without the right to them; the same 404 for anything else; 410 for a withdrawn
 * route. Public, with an optional token.
 */
export const routeSheetRoutes: FastifyPluginAsyncZod<RouteSheetOptions> = async (
  app,
  { directions },
) => {
  const cacheEstimated = estimatedCacheHook(60);

  app.get(
    '/routes/:id',
    {
      onRequest: app.optionalAuth,
      config: { rateLimit: { max: ROUTE_SHEET_RATE_LIMIT, timeWindow: '1 minute' } },
      onSend: async (request, reply, payload) =>
        (request.query as RouteDetailQuery | undefined)?.trips === 'estimated'
          ? cacheEstimated(request, reply, payload)
          : noStore(request, reply, payload),
      schema: {
        tags: ['discovery'],
        summary: 'Route sheet, as the caller may read it, with the trips of this answer',
        params: SheetParams,
        querystring: RouteDetailQuery,
        response: {
          200: RouteDetail,
          400: ApiError,
          401: ApiError,
          404: ApiError,
          410: ApiError,
          429: ApiError,
        },
      },
    },
    async (request) =>
      readSheet(
        app.db,
        request.params.id,
        { user: request.user ?? null, token: request.query.token },
        { directions: request.query.trips === 'estimated' ? null : directions },
      ),
  );
};
